import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  MemberRole,
  WithdrawAccountStatus,
  WithdrawRequestStatus,
} from '../common/enums';
import { Member } from '../entities/member.entity';
import { Wallet } from '../entities/wallet.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { WithdrawAccount } from '../entities/withdraw-account.entity';
import { WithdrawRequest } from '../entities/withdraw-request.entity';
import { WithdrawService } from './withdraw.service';

describe('WithdrawService', () => {
  let service: WithdrawService;

  let memberRepository: any;
  let withdrawAccountRepository: any;
  let withdrawRequestRepository: any;
  let walletRepository: any;
  let walletTransactionRepository: any;
  let dataSource: any;
  let configService: any;
  let queryRunner: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    memberRepository = {
      findOne: jest.fn(),
    };
    withdrawAccountRepository = {
      findOne: jest.fn(),
    };
    withdrawRequestRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    walletRepository = {
      findOne: jest.fn(),
    };
    walletTransactionRepository = {};

    const managerRepositories = new Map<any, any>();
    managerRepositories.set(Member, {
      findOne: jest.fn(),
    });
    managerRepositories.set(WithdrawAccount, {
      findOne: jest.fn(),
    });
    managerRepositories.set(WithdrawRequest, {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 100, ...data })),
      findOne: jest.fn(),
    });
    managerRepositories.set(Wallet, {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    });
    managerRepositories.set(WalletTransaction, {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    });

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getRepository: jest.fn((entity) => managerRepositories.get(entity)),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    };

    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          WITHDRAW_MINIMUM_COIN_AMOUNT: '10',
          WITHDRAW_COIN_UNIT: '10',
          WITHDRAW_CASH_PER_COIN: '100',
          WITHDRAW_FLAT_FEE_AMOUNT: '500',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawService,
        {
          provide: getRepositoryToken(Member),
          useValue: memberRepository,
        },
        {
          provide: getRepositoryToken(WithdrawAccount),
          useValue: withdrawAccountRepository,
        },
        {
          provide: getRepositoryToken(WithdrawRequest),
          useValue: withdrawRequestRepository,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepository,
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: walletTransactionRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<WithdrawService>(WithdrawService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('getPolicy', () => {
    it('환경변수 기반 환전 정책을 반환한다', () => {
      const result = service.getPolicy();

      expect(result.minimumCoinAmount).toBe(10);
      expect(result.coinUnit).toBe(10);
      expect(result.cashPerCoin).toBe(100);
      expect(result.flatFeeAmount).toBe(500);
    });
  });

  describe('create', () => {
    it('미인증 계좌면 BadRequestException을 던진다', async () => {
      queryRunner.manager
        .getRepository(Member)
        .findOne.mockResolvedValue({ id: 1 });
      queryRunner.manager
        .getRepository(WithdrawAccount)
        .findOne.mockResolvedValue({
          id: 1,
          memberId: 1,
          status: WithdrawAccountStatus.ACTIVE,
          verifiedAt: null,
        });

      await expect(service.create(1, { coinAmount: 10 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('최소 환전 수량보다 작으면 BadRequestException을 던진다', async () => {
      queryRunner.manager
        .getRepository(Member)
        .findOne.mockResolvedValue({ id: 1 });
      queryRunner.manager
        .getRepository(WithdrawAccount)
        .findOne.mockResolvedValue({
          id: 1,
          memberId: 1,
          status: WithdrawAccountStatus.ACTIVE,
          verifiedAt: new Date(),
        });

      await expect(service.create(1, { coinAmount: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('환전 신청 시 지갑 차감과 요청 생성을 처리한다', async () => {
      queryRunner.manager
        .getRepository(Member)
        .findOne.mockResolvedValue({ id: 1 });
      queryRunner.manager
        .getRepository(WithdrawAccount)
        .findOne.mockResolvedValue({
          id: 11,
          memberId: 1,
          bankName: '국민은행',
          accountNumberMasked: '123456******34',
          status: WithdrawAccountStatus.ACTIVE,
          verifiedAt: new Date(),
        });
      const wallet = { memberId: 1, balance: 100 };
      queryRunner.manager
        .getRepository(Wallet)
        .findOne.mockResolvedValue(wallet);
      withdrawRequestRepository.findOne.mockResolvedValue({
        id: 100,
        memberId: 1,
        withdrawAccountId: 11,
        withdrawAccount: {
          bankName: '국민은행',
          accountNumberMasked: '123456******34',
        },
        coinAmount: 10,
        cashAmount: 500,
        feeAmount: 500,
        status: WithdrawRequestStatus.REQUESTED,
        reason: null,
        processedAt: null,
        createdAt: new Date('2026-04-05T00:00:00.000Z'),
      });

      const result = await service.create(1, { coinAmount: 10 });

      expect(wallet.balance).toBe(90);
      expect(result.cashAmount).toBe(500);
      expect(result.feeAmount).toBe(500);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('updateByAdmin', () => {
    it('관리자가 아니면 ForbiddenException을 던진다', async () => {
      await expect(
        service.updateByAdmin({ role: MemberRole.ROLE_MEMBER } as Member, 1, {
          status: WithdrawRequestStatus.REJECTED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('반려 시 지갑 잔액을 복구한다', async () => {
      const request = {
        id: 1,
        memberId: 1,
        withdrawAccountId: 11,
        withdrawAccount: {
          bankName: '국민은행',
          accountNumberMasked: '123456******34',
        },
        coinAmount: 10,
        cashAmount: 500,
        feeAmount: 500,
        status: WithdrawRequestStatus.REQUESTED,
        reason: null,
        processedAt: null,
        createdAt: new Date('2026-04-05T00:00:00.000Z'),
      };
      queryRunner.manager
        .getRepository(WithdrawRequest)
        .findOne.mockResolvedValue(request);
      const wallet = { memberId: 1, balance: 90 };
      queryRunner.manager
        .getRepository(Wallet)
        .findOne.mockResolvedValue(wallet);
      queryRunner.manager
        .getRepository(WithdrawRequest)
        .save.mockImplementation(async (data: any) => data);

      const result = await service.updateByAdmin(
        { id: 99, role: MemberRole.ROLE_ADMIN } as Member,
        1,
        { status: WithdrawRequestStatus.REJECTED, reason: '반려' },
      );

      expect(wallet.balance).toBe(100);
      expect(result.status).toBe(WithdrawRequestStatus.REJECTED);
      expect(result.reason).toBe('반려');
    });

    it('완료 상태의 요청은 다시 처리할 수 없다', async () => {
      queryRunner.manager
        .getRepository(WithdrawRequest)
        .findOne.mockResolvedValue({
          id: 1,
          status: WithdrawRequestStatus.COMPLETED,
        });

      await expect(
        service.updateByAdmin(
          { id: 99, role: MemberRole.ROLE_ADMIN } as Member,
          1,
          { status: WithdrawRequestStatus.REJECTED },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllForAdmin', () => {
    it('관리자 필터 조건을 반영해 환전 요청 목록을 조회한다', async () => {
      const queryBuilder = createQueryBuilderMock([
        {
          id: 1,
          memberId: 10,
          withdrawAccountId: 11,
          withdrawAccount: {
            bankName: '국민은행',
            accountNumberMasked: '123456******34',
          },
          member: {
            id: 10,
            nickname: '그림좋아',
            email: 'user@example.com',
            profile: {
              profileUrl: 'https://cdn.example.com/profile.png',
            },
          },
          coinAmount: 10,
          cashAmount: 500,
          feeAmount: 500,
          status: WithdrawRequestStatus.REQUESTED,
          reason: null,
          processedAt: null,
          createdAt: new Date('2026-04-05T00:00:00.000Z'),
        },
      ]);
      withdrawRequestRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      const result = await service.findAllForAdmin(
        { role: MemberRole.ROLE_ADMIN } as Member,
        {
          status: WithdrawRequestStatus.REQUESTED,
          bankCode: '004',
          keyword: '홍길동',
        },
      );

      expect(withdrawRequestRepository.createQueryBuilder).toHaveBeenCalledWith(
        'withdrawRequest',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].memberNickname).toBe('그림좋아');
    });
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
