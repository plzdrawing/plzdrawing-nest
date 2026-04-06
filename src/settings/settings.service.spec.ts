import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemberRole } from '../common/enums';
import { AppSetting } from '../entities/app-setting.entity';
import { Member } from '../entities/member.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { Terms } from '../entities/terms.entity';
import { Wallet } from '../entities/wallet.entity';
import { WithdrawAccountService } from '../withdraw-account/withdraw-account.service';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  let appSettingRepository: any;
  let memberRepository: any;
  let notificationPreferenceRepository: any;
  let termsRepository: any;
  let walletRepository: any;
  let withdrawAccountService: any;
  let configService: any;

  beforeEach(async () => {
    appSettingRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    memberRepository = {
      findOne: jest.fn(),
    };
    notificationPreferenceRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    termsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      remove: jest.fn(async (data) => data),
    };
    walletRepository = {
      findOne: jest.fn(),
    };
    withdrawAccountService = {
      hasActiveWithdrawAccount: jest.fn(),
    };
    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(AppSetting),
          useValue: appSettingRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: memberRepository,
        },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: notificationPreferenceRepository,
        },
        {
          provide: getRepositoryToken(Terms),
          useValue: termsRepository,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepository,
        },
        {
          provide: WithdrawAccountService,
          useValue: withdrawAccountService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('관리자가 아니면 약관을 등록할 수 없어야 한다', async () => {
    await expect(
      service.createTerm({ role: MemberRole.ROLE_MEMBER } as Member, {
        title: '서비스 이용약관',
        version: '1.0.0',
        content: '약관 내용',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('관리자는 약관을 등록할 수 있어야 한다', async () => {
    termsRepository.save.mockImplementation(async (data: any) => ({
      id: 1,
      createdAt: new Date('2026-04-06T00:00:00.000Z'),
      ...data,
    }));

    const result = await service.createTerm(
      { id: 99, role: MemberRole.ROLE_ADMIN } as Member,
      {
        title: '서비스 이용약관',
        version: '1.0.0',
        content: '약관 내용',
      },
    );

    expect(result.title).toBe('서비스 이용약관');
    expect(result.version).toBe('1.0.0');
  });

  it('없는 약관 수정 시 NotFoundException을 던져야 한다', async () => {
    termsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateTerm({ id: 99, role: MemberRole.ROLE_ADMIN } as Member, 1, {
        title: '수정된 제목',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('관리자는 앱 정보를 수정할 수 있어야 한다', async () => {
    appSettingRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        minimumSupportedVersion: '1.1.0',
        supportEmail: 'help@plzdrawing.com',
        supportHours: '평일 10:00 - 18:00',
        privacyPolicyUrl: 'https://example.com/privacy',
      });
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        APP_VERSION: '1.2.0',
        MIN_SUPPORTED_VERSION: '1.0.0',
        SUPPORT_EMAIL: 'support@plzdrawing.com',
        SUPPORT_HOURS: '평일 10:00 - 18:00',
        PRIVACY_POLICY_URL: 'https://example.com/privacy',
      };
      return values[key];
    });

    const result = await service.updateAppInfo(
      { role: MemberRole.ROLE_ADMIN } as Member,
      {
        minimumSupportedVersion: '1.1.0',
        supportEmail: 'help@plzdrawing.com',
      },
    );

    expect(appSettingRepository.save).toHaveBeenCalled();
    expect(result.minimumSupportedVersion).toBe('1.1.0');
    expect(result.supportEmail).toBe('help@plzdrawing.com');
  });

  it('관리자는 필터 조건으로 약관 목록을 조회할 수 있어야 한다', async () => {
    const queryBuilder = createQueryBuilderMock([
      {
        id: 1,
        title: '서비스 이용약관',
        version: '1.0.0',
        content: '약관 본문',
        adminId: 10,
        admin: {
          id: 10,
          nickname: '관리자',
          email: 'admin@example.com',
          profile: {
            profileUrl: 'https://cdn.example.com/admin.png',
          },
        },
        createdAt: new Date('2026-04-06T00:00:00.000Z'),
      },
    ]);
    termsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getTermsForAdmin(
      { role: MemberRole.ROLE_ADMIN } as Member,
      { keyword: '이용약관' },
    );

    expect(termsRepository.createQueryBuilder).toHaveBeenCalledWith('terms');
    expect(queryBuilder.andWhere).toHaveBeenCalled();
    expect(result[0].adminNickname).toBe('관리자');
  });

  it('관리자는 약관 상세를 조회할 수 있어야 한다', async () => {
    termsRepository.findOne.mockResolvedValue({
      id: 1,
      title: '서비스 이용약관',
      version: '1.0.0',
      content: '약관 본문',
      adminId: 10,
      admin: {
        id: 10,
        nickname: '관리자',
        email: 'admin@example.com',
        profile: {
          profileUrl: 'https://cdn.example.com/admin.png',
        },
      },
      createdAt: new Date('2026-04-06T00:00:00.000Z'),
    });

    const result = await service.getTermForAdmin(
      { role: MemberRole.ROLE_ADMIN } as Member,
      1,
    );

    expect(result.adminNickname).toBe('관리자');
  });
});

function createQueryBuilderMock(result: any[]) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}
