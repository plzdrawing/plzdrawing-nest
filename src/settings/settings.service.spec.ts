import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemberRole } from '../common/enums';
import { Member } from '../entities/member.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { Terms } from '../entities/terms.entity';
import { Wallet } from '../entities/wallet.entity';
import { WithdrawAccountService } from '../withdraw-account/withdraw-account.service';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  let memberRepository: any;
  let notificationPreferenceRepository: any;
  let termsRepository: any;
  let walletRepository: any;
  let withdrawAccountService: any;
  let configService: any;

  beforeEach(async () => {
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
});
