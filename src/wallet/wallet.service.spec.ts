import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MemberRole, PaymentMethod, PaymentStatus } from '../common/enums';
import { CoinProduct } from '../entities/coin-product.entity';
import { CoinOrder } from '../entities/coin-order.entity';
import { Member } from '../entities/member.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { TossPaymentsService } from './toss-payments.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;

  const memberRepository = {
    findOne: jest.fn(),
  };

  const walletRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((data) => data),
  };

  const walletTransactionRepository = {
    create: jest.fn((data) => data),
    save: jest.fn(),
  };

  const coinProductRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((data) => data),
  };

  const coinOrderRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    create: jest.fn((data) => data),
  };

  const txCoinOrderRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const txWalletRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((data) => data),
  };

  const txWalletTransactionRepository = {
    create: jest.fn((data) => data),
    save: jest.fn(),
  };

  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      getRepository: jest.fn((entity) => {
        if (entity === CoinOrder) {
          return txCoinOrderRepository;
        }
        if (entity === Wallet) {
          return txWalletRepository;
        }
        if (entity === WalletTransaction) {
          return txWalletTransactionRepository;
        }
        throw new Error(`Unexpected repository: ${entity?.name}`);
      }),
    },
  };

  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
  };

  const tossPaymentsService = {
    confirmPayment: jest.fn(),
    cancelPayment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new WalletService(
      memberRepository as never,
      walletRepository as never,
      walletTransactionRepository as never,
      coinProductRepository as never,
      coinOrderRepository as never,
      dataSource as unknown as DataSource,
      tossPaymentsService as unknown as TossPaymentsService,
    );
  });

  it('정의되어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('관리자가 아니면 코인 상품을 등록할 수 없어야 한다', async () => {
    await expect(
      service.createCoinProduct({ role: MemberRole.ROLE_MEMBER } as Member, {
        name: '그리코인 10개',
        coinAmount: 10,
        price: 1200,
        displayOrder: 1,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('관리자는 코인 상품을 등록할 수 있어야 한다', async () => {
    coinProductRepository.findOne.mockResolvedValue(null);
    coinProductRepository.save.mockImplementation(async (data) => ({
      id: 10,
      isActive: true,
      description: null,
      ...data,
    }));

    const result = await service.createCoinProduct(
      { role: MemberRole.ROLE_ADMIN } as Member,
      {
        name: '그리코인 10개',
        coinAmount: 10,
        price: 1200,
        displayOrder: 1,
      },
    );

    expect(result.coinAmount).toBe(10);
    expect(result.isActive).toBe(true);
  });

  it('코인 수량이 중복되면 코인 상품 수정을 막아야 한다', async () => {
    coinProductRepository.findOne
      .mockResolvedValueOnce({
        id: 1,
        name: '그리코인 10개',
        coinAmount: 10,
        price: 1200,
        displayOrder: 1,
        description: null,
        isActive: true,
      })
      .mockResolvedValueOnce({
        id: 2,
        coinAmount: 30,
      });

    await expect(
      service.updateCoinProduct({ role: MemberRole.ROLE_ADMIN } as Member, 1, {
        coinAmount: 30,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('관리자 필터 조건을 반영해 코인 주문 목록을 조회한다', async () => {
    const queryBuilder = createQueryBuilderMock([
      {
        ...createPendingOrder(),
        member: {
          id: 10,
          nickname: '그림좋아',
          email: 'user@example.com',
          profile: {
            profileUrl: 'https://cdn.example.com/profile.png',
          },
        },
      },
    ]);
    coinOrderRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getCoinOrdersForAdmin(
      { role: MemberRole.ROLE_ADMIN } as Member,
      {
        page: 1,
        limit: 10,
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.TOSS_PAY,
        keyword: 'coin-order',
      },
    );

    expect(coinOrderRepository.createQueryBuilder).toHaveBeenCalledWith(
      'coinOrder',
    );
    expect(queryBuilder.andWhere).toHaveBeenCalled();
    expect(result.data[0].memberNickname).toBe('그림좋아');
  });

  it('관리자는 코인 주문 상세를 조회할 수 있어야 한다', async () => {
    coinOrderRepository.findOne.mockResolvedValue({
      ...createPendingOrder(),
      member: {
        id: 10,
        nickname: '그림좋아',
        email: 'user@example.com',
        profile: {
          profileUrl: 'https://cdn.example.com/profile.png',
        },
      },
    });

    const result = await service.getCoinOrderForAdmin(
      { role: MemberRole.ROLE_ADMIN } as Member,
      1,
    );

    expect(result.memberNickname).toBe('그림좋아');
  });

  it('이미 사용한 paymentKey면 결제 승인을 막아야 한다', async () => {
    const order = createPendingOrder();

    txCoinOrderRepository.findOne
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({ id: 999 });

    await expect(
      service.confirmCoinOrder(1, 1, {
        paymentKey: 'used-payment-key',
        amount: 1200,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(tossPaymentsService.confirmPayment).not.toHaveBeenCalled();
  });

  it('토스 승인 응답이 DONE이 아니면 결제 완료 처리하지 않아야 한다', async () => {
    const order = createPendingOrder();

    txCoinOrderRepository.findOne
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(null);
    tossPaymentsService.confirmPayment.mockResolvedValue({
      paymentKey: 'payment-key',
      orderId: order.orderCode,
      totalAmount: order.amount,
      status: 'ABORTED',
    });

    await expect(
      service.confirmCoinOrder(1, 1, {
        paymentKey: 'payment-key',
        amount: 1200,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(txWalletRepository.save).not.toHaveBeenCalled();
    expect(txWalletTransactionRepository.save).not.toHaveBeenCalled();
  });

  it('토스 취소 응답이 CANCELED가 아니면 주문 취소를 막아야 한다', async () => {
    const order = createCompletedOrder();

    txCoinOrderRepository.findOne.mockResolvedValue(order);
    txWalletRepository.findOne.mockResolvedValue({
      memberId: 1,
      balance: 20,
    });
    tossPaymentsService.cancelPayment.mockResolvedValue({
      paymentKey: 'payment-key',
      orderId: order.orderCode,
      totalAmount: order.amount,
      status: 'DONE',
    });

    await expect(
      service.cancelCoinOrder(1, 1, {
        cancelReason: '사용자 요청',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(txWalletRepository.save).not.toHaveBeenCalled();
    expect(txWalletTransactionRepository.save).not.toHaveBeenCalled();
  });

  it('ABORTED 웹훅이면 대기중 주문을 FAILED로 바꿔야 한다', async () => {
    const order = createPendingOrder();

    coinOrderRepository.findOne.mockResolvedValue(order);
    coinOrderRepository.save.mockImplementation(async (data) => data);

    await service.handleTossWebhook({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: {
        orderId: order.orderCode,
        paymentKey: 'payment-key',
        status: 'ABORTED',
        totalAmount: order.amount,
      },
    });

    expect(coinOrderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PaymentStatus.FAILED,
        paymentKey: 'payment-key',
      }),
    );
  });

  it('DONE 웹훅이면 상태를 유지하고 paymentKey만 반영해야 한다', async () => {
    const order = createPendingOrder();

    coinOrderRepository.findOne.mockResolvedValue(order);
    coinOrderRepository.save.mockImplementation(async (data) => data);

    await service.handleTossWebhook({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: {
        orderId: order.orderCode,
        paymentKey: 'payment-key',
        status: 'DONE',
        totalAmount: order.amount,
      },
    });

    expect(coinOrderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PaymentStatus.PENDING,
        paymentKey: 'payment-key',
      }),
    );
  });

  it('완료된 주문에는 웹훅이 와도 상태를 바꾸지 않아야 한다', async () => {
    coinOrderRepository.findOne.mockResolvedValue(createCompletedOrder());

    await service.handleTossWebhook({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: {
        orderId: 'coin-order-1',
        paymentKey: 'payment-key',
        status: 'ABORTED',
        totalAmount: 1200,
      },
    });

    expect(coinOrderRepository.save).not.toHaveBeenCalled();
  });

  it('웹훅 금액이 주문 금액과 다르면 무시해야 한다', async () => {
    coinOrderRepository.findOne.mockResolvedValue(createPendingOrder());

    await service.handleTossWebhook({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: {
        orderId: 'coin-order-1',
        status: 'CANCELED',
        totalAmount: 9999,
      },
    });

    expect(coinOrderRepository.save).not.toHaveBeenCalled();
  });
});

function createPendingOrder(): CoinOrder {
  return {
    id: 1,
    memberId: 1,
    coinProductId: 1,
    orderCode: 'coin-order-1',
    coinAmount: 10,
    amount: 1200,
    paymentMethod: PaymentMethod.TOSS_PAY,
    status: PaymentStatus.PENDING,
    paymentKey: null,
    approvedAt: null,
    cancelReason: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    member: {} as Member,
    coinProduct: {
      id: 1,
      name: '10코인',
    } as CoinProduct,
  } as CoinOrder;
}

function createCompletedOrder(): CoinOrder {
  return {
    ...createPendingOrder(),
    status: PaymentStatus.COMPLETED,
    paymentKey: 'payment-key',
    approvedAt: new Date(),
  };
}

function createQueryBuilderMock(result: any[]) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([result, result.length]),
  };
}
