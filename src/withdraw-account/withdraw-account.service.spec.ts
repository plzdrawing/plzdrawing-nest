import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { MemberRole, WithdrawAccountStatus } from '../common/enums';
import { Member } from '../entities/member.entity';
import { WithdrawAccount } from '../entities/withdraw-account.entity';
import { WithdrawAccountService } from './withdraw-account.service';

describe('WithdrawAccountService', () => {
  let service: WithdrawAccountService;

  let memberRepository: any;
  let withdrawAccountRepository: any;
  let configService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    memberRepository = {
      findOne: jest.fn(),
    };

    withdrawAccountRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      update: jest.fn(),
      count: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'WITHDRAW_ACCOUNT_SECRET') {
          return 'test-withdraw-secret';
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawAccountService,
        {
          provide: getRepositoryToken(Member),
          useValue: memberRepository,
        },
        {
          provide: getRepositoryToken(WithdrawAccount),
          useValue: withdrawAccountRepository,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<WithdrawAccountService>(WithdrawAccountService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('회원이 없으면 NotFoundException을 던진다', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(1, {
          bankCode: '004',
          bankName: '국민은행',
          accountHolder: '홍길동',
          accountNumber: '1234567890',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('첫 계좌 등록 시 대표 계좌로 저장한다', async () => {
      memberRepository.findOne.mockResolvedValue({ id: 1 });
      withdrawAccountRepository.find.mockResolvedValue([]);
      withdrawAccountRepository.save.mockImplementation(async (data: any) => ({
        id: 100,
        verifiedAt: null,
        createdAt: new Date('2026-04-05T00:00:00.000Z'),
        ...data,
      }));

      const result = await service.create(1, {
        bankCode: '004',
        bankName: '국민은행',
        accountHolder: '홍길동',
        accountNumber: '12345678901234',
      });

      expect(withdrawAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 1,
          bankCode: '004',
          bankName: '국민은행',
          accountHolder: '홍길동',
          isPrimary: true,
          status: WithdrawAccountStatus.ACTIVE,
        }),
      );
      expect(result.isPrimary).toBe(true);
      expect(result.accountNumberMasked).toContain('******');
    });

    it('중복 계좌면 BadRequestException을 던진다', async () => {
      memberRepository.findOne.mockResolvedValue({ id: 1 });
      withdrawAccountRepository.find.mockResolvedValue([
        {
          accountNumberEncrypted: encryptAccountNumber(
            'test-withdraw-secret',
            '12345678901234',
          ),
          status: WithdrawAccountStatus.ACTIVE,
        },
      ]);

      await expect(
        service.create(1, {
          bankCode: '004',
          bankName: '국민은행',
          accountHolder: '홍길동',
          accountNumber: '12345678901234',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setPrimary', () => {
    it('다른 계좌를 대표 계좌로 변경한다', async () => {
      memberRepository.findOne.mockResolvedValue({ id: 1 });
      withdrawAccountRepository.findOne.mockResolvedValue({
        id: 2,
        memberId: 1,
        bankCode: '004',
        bankName: '국민은행',
        accountHolder: '홍길동',
        accountNumberMasked: '123456******34',
        isPrimary: false,
        status: WithdrawAccountStatus.ACTIVE,
        verifiedAt: null,
        createdAt: new Date('2026-04-05T00:00:00.000Z'),
      });
      withdrawAccountRepository.save.mockImplementation(
        async (data: any) => data,
      );

      const result = await service.setPrimary(1, 2);

      expect(withdrawAccountRepository.update).toHaveBeenCalledWith(
        { memberId: 1, isPrimary: true, status: WithdrawAccountStatus.ACTIVE },
        { isPrimary: false },
      );
      expect(result.isPrimary).toBe(true);
    });
  });

  describe('verifyByAdmin', () => {
    it('관리자가 아니면 ForbiddenException을 던진다', async () => {
      await expect(
        service.verifyByAdmin(
          { role: MemberRole.ROLE_MEMBER } as Member,
          1,
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('관리자는 계좌를 인증 처리할 수 있다', async () => {
      withdrawAccountRepository.findOne.mockResolvedValue({
        id: 1,
        bankCode: '004',
        bankName: '국민은행',
        accountHolder: '홍길동',
        accountNumberMasked: '123456******34',
        isPrimary: true,
        status: WithdrawAccountStatus.ACTIVE,
        verifiedAt: null,
        createdAt: new Date('2026-04-05T00:00:00.000Z'),
      });
      withdrawAccountRepository.save.mockImplementation(
        async (data: any) => data,
      );

      const result = await service.verifyByAdmin(
        { id: 10, role: MemberRole.ROLE_ADMIN } as Member,
        1,
        {},
      );

      expect(result.verifiedAt).toBeTruthy();
    });
  });
});

function encryptAccountNumber(secret: string, accountNumber: string): string {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = Buffer.alloc(16, 1);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(accountNumber, 'utf8'),
    cipher.final(),
  ]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}
