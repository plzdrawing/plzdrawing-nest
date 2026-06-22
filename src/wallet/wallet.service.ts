import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Brackets } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  PaymentMethod,
  PaymentStatus,
  MemberRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../common/enums';
import { CoinProduct } from '../entities/coin-product.entity';
import { CoinOrder } from '../entities/coin-order.entity';
import { Member } from '../entities/member.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { CoinProductResponseDto } from './dto/coin-product-response.dto';
import { CoinOrderPageResponseDto } from './dto/coin-order-page-response.dto';
import { CoinOrderResponseDto } from './dto/coin-order-response.dto';
import { CoinOrderAdminQueryDto } from './dto/coin-order-admin-query.dto';
import { CancelCoinOrderDto } from './dto/cancel-coin-order.dto';
import { ConfirmCoinOrderDto } from './dto/confirm-coin-order.dto';
import { CreateCoinProductDto } from './dto/create-coin-product.dto';
import { CreateCoinOrderDto } from './dto/create-coin-order.dto';
import { TossWebhookDto } from './dto/toss-webhook.dto';
import { UpdateCoinProductDto } from './dto/update-coin-product.dto';
import { WalletSummaryResponseDto } from './dto/wallet-summary-response.dto';
import {
  WalletBalanceMismatchPageResponseDto,
  WalletBalanceMismatchResponseDto,
} from './dto/wallet-balance-mismatch-response.dto';
import { WalletTransactionPageResponseDto } from './dto/wallet-transaction-page-response.dto';
import { WalletTransactionResponseDto } from './dto/wallet-transaction-response.dto';
import {
  WalletTransactionSourceDuplicatePageResponseDto,
  WalletTransactionSourceDuplicateResponseDto,
} from './dto/wallet-transaction-source-duplicate-response.dto';
import {
  TossPaymentsService,
  type TossPaymentResponse,
} from './toss-payments.service';

const COIN_ORDER_SOURCE_TYPE = 'COIN_ORDER';

type WalletBalanceMismatchRaw = {
  memberId: string | number;
  memberEmail: string | null;
  memberNickname: string | null;
  walletBalance: string | number;
  transactionBalance: string | number | null;
  difference: string | number;
};

type WalletTransactionSourceDuplicateRaw = {
  memberId: string | number;
  memberEmail: string | null;
  memberNickname: string | null;
  type: WalletTransactionType;
  sourceType: string;
  sourceId: string | number;
  transactionCount: string | number;
  coinAmountSum: string | number | null;
  firstCreatedAt: string | Date | null;
  lastCreatedAt: string | Date | null;
};

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(CoinProduct)
    private readonly coinProductRepository: Repository<CoinProduct>,
    @InjectRepository(CoinOrder)
    private readonly coinOrderRepository: Repository<CoinOrder>,
    private readonly dataSource: DataSource,
    private readonly tossPaymentsService: TossPaymentsService,
  ) {}

  async getMyWallet(memberId: number): Promise<WalletSummaryResponseDto> {
    const wallet = await this.getOrCreateWallet(memberId);
    return new WalletSummaryResponseDto(wallet.balance);
  }

  async getMyTransactions(
    memberId: number,
    paginationDto: PaginationDto,
  ): Promise<WalletTransactionPageResponseDto> {
    await this.assertMemberExists(memberId);

    const { page = 1, limit = 10 } = paginationDto;
    const [transactions, total] =
      await this.walletTransactionRepository.findAndCount({
        where: { memberId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      data: transactions.map(
        (transaction) =>
          new WalletTransactionResponseDto(
            transaction.id,
            transaction.type,
            transaction.coinAmount,
            transaction.cashAmount,
            transaction.status,
            transaction.description,
            transaction.sourceType,
            transaction.sourceId,
            transaction.createdAt,
          ),
      ),
      total,
      page,
      limit,
    };
  }

  async getWalletBalanceMismatchesForAdmin(
    member: Member,
    paginationDto: PaginationDto,
  ): Promise<WalletBalanceMismatchPageResponseDto> {
    this.assertAdmin(member);

    const { page = 1, limit = 10 } = paginationDto;
    const totalRows =
      await this.createWalletBalanceMismatchQuery().getRawMany();
    const rows = await this.createWalletBalanceMismatchQuery()
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<WalletBalanceMismatchRaw>();

    return {
      data: rows.map((row) => this.mapWalletBalanceMismatch(row)),
      total: totalRows.length,
      page,
      limit,
    };
  }

  async getWalletTransactionSourceDuplicatesForAdmin(
    member: Member,
    paginationDto: PaginationDto,
  ): Promise<WalletTransactionSourceDuplicatePageResponseDto> {
    this.assertAdmin(member);

    const { page = 1, limit = 10 } = paginationDto;
    const totalRows =
      await this.createWalletTransactionSourceDuplicateQuery().getRawMany();
    const rows = await this.createWalletTransactionSourceDuplicateQuery()
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<WalletTransactionSourceDuplicateRaw>();

    return {
      data: rows.map((row) => this.mapWalletTransactionSourceDuplicate(row)),
      total: totalRows.length,
      page,
      limit,
    };
  }

  async getCoinProducts(): Promise<CoinProductResponseDto[]> {
    const products = await this.coinProductRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', id: 'ASC' },
    });

    return products.map(
      (product) =>
        new CoinProductResponseDto(
          product.id,
          product.name,
          product.coinAmount,
          product.price,
          product.displayOrder,
          product.description,
          product.isActive,
        ),
    );
  }

  async getCoinProductsForAdmin(
    member: Member,
  ): Promise<CoinProductResponseDto[]> {
    this.assertAdmin(member);

    const products = await this.coinProductRepository.find({
      order: { displayOrder: 'ASC', id: 'ASC' },
    });

    return products.map((product) => this.mapCoinProduct(product));
  }

  async getCoinProductForAdmin(
    member: Member,
    productId: number,
  ): Promise<CoinProductResponseDto> {
    this.assertAdmin(member);

    const product = await this.coinProductRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Coin product not found');
    }

    return this.mapCoinProduct(product);
  }

  async createCoinProduct(
    member: Member,
    dto: CreateCoinProductDto,
  ): Promise<CoinProductResponseDto> {
    this.assertAdmin(member);
    await this.assertCoinProductUniqueness(dto.coinAmount, null);

    const savedProduct = await this.coinProductRepository.save(
      this.coinProductRepository.create({
        name: dto.name.trim(),
        coinAmount: dto.coinAmount,
        price: dto.price,
        displayOrder: dto.displayOrder,
        description: dto.description?.trim() ?? null,
        isActive: dto.isActive ?? true,
      }),
    );

    return this.mapCoinProduct(savedProduct);
  }

  async updateCoinProduct(
    member: Member,
    productId: number,
    dto: UpdateCoinProductDto,
  ): Promise<CoinProductResponseDto> {
    this.assertAdmin(member);

    const product = await this.coinProductRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Coin product not found');
    }

    if (dto.coinAmount !== undefined && dto.coinAmount !== product.coinAmount) {
      await this.assertCoinProductUniqueness(dto.coinAmount, product.id);
      product.coinAmount = dto.coinAmount;
    }

    if (dto.name !== undefined) {
      product.name = dto.name.trim();
    }
    if (dto.price !== undefined) {
      product.price = dto.price;
    }
    if (dto.displayOrder !== undefined) {
      product.displayOrder = dto.displayOrder;
    }
    if (dto.description !== undefined) {
      product.description = dto.description?.trim() ?? null;
    }
    if (dto.isActive !== undefined) {
      product.isActive = dto.isActive;
    }

    const savedProduct = await this.coinProductRepository.save(product);
    return this.mapCoinProduct(savedProduct);
  }

  async createCoinOrder(
    memberId: number,
    dto: CreateCoinOrderDto,
  ): Promise<CoinOrderResponseDto> {
    await this.assertMemberExists(memberId);

    if (dto.paymentMethod && dto.paymentMethod !== PaymentMethod.TOSS_PAY) {
      throw new BadRequestException(
        'Only TOSS_PAY is supported for coin orders for now',
      );
    }

    const product = await this.coinProductRepository.findOne({
      where: { id: dto.coinProductId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException('Coin product not found');
    }

    const order = await this.coinOrderRepository.save(
      this.coinOrderRepository.create({
        memberId,
        coinProductId: product.id,
        orderCode: this.generateOrderCode(),
        coinAmount: product.coinAmount,
        amount: product.price,
        paymentMethod: PaymentMethod.TOSS_PAY,
        status: PaymentStatus.PENDING,
      }),
    );

    return this.mapCoinOrder(order, product);
  }

  async confirmCoinOrder(
    memberId: number,
    orderId: number,
    dto: ConfirmCoinOrderDto,
  ): Promise<CoinOrderResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepository = queryRunner.manager.getRepository(CoinOrder);
      const walletRepository = queryRunner.manager.getRepository(Wallet);
      const walletTransactionRepository =
        queryRunner.manager.getRepository(WalletTransaction);

      const order = await orderRepository.findOne({
        where: { id: orderId, memberId },
        relations: ['coinProduct'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException('Coin order not found');
      }
      if (
        order.status === PaymentStatus.COMPLETED &&
        order.paymentKey === dto.paymentKey &&
        order.amount === dto.amount
      ) {
        await queryRunner.commitTransaction();
        return this.mapCoinOrder(order, order.coinProduct);
      }
      if (order.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('Coin order is not in pending status');
      }
      if (dto.amount !== order.amount) {
        throw new BadRequestException('Coin order amount does not match');
      }
      const existingOrderWithPaymentKey = await orderRepository.findOne({
        where: { paymentKey: dto.paymentKey },
      });
      if (
        existingOrderWithPaymentKey &&
        existingOrderWithPaymentKey.id !== order.id
      ) {
        throw new BadRequestException('Payment key already used');
      }

      const tossPayment = await this.tossPaymentsService.confirmPayment(
        dto.paymentKey,
        order.orderCode,
        dto.amount,
      );
      if (!tossPayment || typeof tossPayment.status !== 'string') {
        throw new BadGatewayException('Invalid Toss payment response');
      }
      if (tossPayment.status !== 'DONE') {
        throw new BadRequestException('Toss payment is not completed');
      }
      if (tossPayment.orderId !== order.orderCode) {
        throw new BadRequestException('Toss payment order does not match');
      }
      if (tossPayment.totalAmount !== order.amount) {
        throw new BadRequestException('Toss payment amount does not match');
      }

      let wallet = await walletRepository.findOne({
        where: { memberId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = walletRepository.create({
          memberId,
          balance: 0,
        });
      }

      wallet.balance += order.coinAmount;
      await walletRepository.save(wallet);

      order.status = PaymentStatus.COMPLETED;
      order.paymentKey = tossPayment.paymentKey;
      order.approvedAt = tossPayment.approvedAt
        ? new Date(tossPayment.approvedAt)
        : new Date();
      const savedOrder = await orderRepository.save(order);

      await walletTransactionRepository.save(
        walletTransactionRepository.create({
          memberId,
          type: WalletTransactionType.CHARGE,
          coinAmount: order.coinAmount,
          cashAmount: order.amount,
          status: WalletTransactionStatus.COMPLETED,
          description: `${order.coinAmount}코인 충전`,
          sourceType: COIN_ORDER_SOURCE_TYPE,
          sourceId: order.id,
        }),
      );

      await queryRunner.commitTransaction();

      return this.mapCoinOrder(savedOrder, savedOrder.coinProduct);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getCoinOrders(
    memberId: number,
    paginationDto: PaginationDto,
  ): Promise<CoinOrderPageResponseDto> {
    await this.assertMemberExists(memberId);

    const { page = 1, limit = 10 } = paginationDto;
    const [orders, total] = await this.coinOrderRepository.findAndCount({
      where: { memberId },
      relations: ['coinProduct'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: orders.map((order) => this.mapCoinOrder(order, order.coinProduct)),
      total,
      page,
      limit,
    };
  }

  async getCoinOrdersForAdmin(
    member: Member,
    query: CoinOrderAdminQueryDto,
  ): Promise<CoinOrderPageResponseDto> {
    this.assertAdmin(member);

    const { page = 1, limit = 10 } = query;
    const queryBuilder = this.coinOrderRepository
      .createQueryBuilder('coinOrder')
      .leftJoinAndSelect('coinOrder.coinProduct', 'coinProduct')
      .leftJoinAndSelect('coinOrder.member', 'member')
      .leftJoinAndSelect('member.profile', 'profile')
      .orderBy('coinOrder.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      queryBuilder.andWhere('coinOrder.status = :status', {
        status: query.status,
      });
    }

    if (query.paymentMethod) {
      queryBuilder.andWhere('coinOrder.paymentMethod = :paymentMethod', {
        paymentMethod: query.paymentMethod,
      });
    }

    if (query.memberId) {
      queryBuilder.andWhere('coinOrder.memberId = :memberId', {
        memberId: query.memberId,
      });
    }

    const keyword = query.keyword?.trim();
    if (keyword) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('member.nickname LIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('member.email LIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('coinOrder.orderCode LIKE :keyword', {
              keyword: `%${keyword}%`,
            })
            .orWhere('coinProduct.name LIKE :keyword', {
              keyword: `%${keyword}%`,
            });
        }),
      );
    }

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: orders.map((order) => this.mapCoinOrder(order, order.coinProduct)),
      total,
      page,
      limit,
    };
  }

  async getCoinOrder(
    memberId: number,
    orderId: number,
  ): Promise<CoinOrderResponseDto> {
    const order = await this.coinOrderRepository.findOne({
      where: { id: orderId, memberId },
      relations: ['coinProduct'],
    });
    if (!order) {
      throw new NotFoundException('Coin order not found');
    }

    return this.mapCoinOrder(order, order.coinProduct);
  }

  async getCoinOrderForAdmin(
    member: Member,
    orderId: number,
  ): Promise<CoinOrderResponseDto> {
    this.assertAdmin(member);

    const order = await this.coinOrderRepository.findOne({
      where: { id: orderId },
      relations: ['coinProduct', 'member', 'member.profile'],
    });
    if (!order) {
      throw new NotFoundException('Coin order not found');
    }

    return this.mapCoinOrder(order, order.coinProduct);
  }

  async cancelCoinOrder(
    memberId: number,
    orderId: number,
    dto: CancelCoinOrderDto,
  ): Promise<CoinOrderResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepository = queryRunner.manager.getRepository(CoinOrder);
      const walletRepository = queryRunner.manager.getRepository(Wallet);
      const walletTransactionRepository =
        queryRunner.manager.getRepository(WalletTransaction);

      const order = await orderRepository.findOne({
        where: { id: orderId, memberId },
        relations: ['coinProduct'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException('Coin order not found');
      }
      if (order.status === PaymentStatus.CANCELLED) {
        await queryRunner.commitTransaction();
        return this.mapCoinOrder(order, order.coinProduct);
      }
      if (order.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException(
          'Only completed coin orders can be cancelled',
        );
      }
      if (!order.paymentKey) {
        throw new BadRequestException('Payment key is missing');
      }

      const wallet = await walletRepository.findOne({
        where: { memberId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
      if (wallet.balance < order.coinAmount) {
        throw new BadRequestException(
          'Not enough coin balance to cancel this order',
        );
      }

      const canceledPayment = await this.tossPaymentsService.cancelPayment(
        order.paymentKey,
        dto.cancelReason,
      );
      if (!canceledPayment || typeof canceledPayment.status !== 'string') {
        throw new BadGatewayException('Invalid Toss cancel response');
      }
      if (canceledPayment.status !== 'CANCELED') {
        throw new BadRequestException('Toss payment is not cancelled');
      }
      if (canceledPayment.orderId !== order.orderCode) {
        throw new BadRequestException('Toss cancel order does not match');
      }

      wallet.balance -= order.coinAmount;
      await walletRepository.save(wallet);

      order.status = PaymentStatus.CANCELLED;
      order.cancelReason = dto.cancelReason;
      order.cancelledAt = new Date();
      const savedOrder = await orderRepository.save(order);

      await walletTransactionRepository.save(
        walletTransactionRepository.create({
          memberId,
          type: WalletTransactionType.REFUND,
          coinAmount: -order.coinAmount,
          cashAmount: order.amount,
          status: WalletTransactionStatus.COMPLETED,
          description: `${order.coinAmount}코인 결제 취소`,
          sourceType: COIN_ORDER_SOURCE_TYPE,
          sourceId: order.id,
        }),
      );

      await queryRunner.commitTransaction();
      return this.mapCoinOrder(savedOrder, savedOrder.coinProduct);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async handleTossWebhook(payload: TossWebhookDto): Promise<void> {
    if (payload.eventType && payload.eventType !== 'PAYMENT_STATUS_CHANGED') {
      return;
    }

    const webhookOrderId =
      typeof payload.data?.orderId === 'string' ? payload.data.orderId : null;
    const webhookPaymentKey =
      typeof payload.data?.paymentKey === 'string'
        ? payload.data.paymentKey
        : null;

    if (!webhookOrderId || !webhookPaymentKey) {
      return;
    }

    let tossPayment: TossPaymentResponse;
    try {
      tossPayment =
        await this.tossPaymentsService.getPayment(webhookPaymentKey);
    } catch (error) {
      if (error instanceof BadRequestException) {
        return;
      }
      throw error;
    }
    const orderId =
      typeof tossPayment.orderId === 'string' ? tossPayment.orderId : null;
    const status =
      typeof tossPayment.status === 'string' ? tossPayment.status : null;
    const paymentKey =
      typeof tossPayment.paymentKey === 'string'
        ? tossPayment.paymentKey
        : null;
    const totalAmount =
      typeof tossPayment.totalAmount === 'number'
        ? tossPayment.totalAmount
        : null;

    if (
      !orderId ||
      !status ||
      !paymentKey ||
      orderId !== webhookOrderId ||
      paymentKey !== webhookPaymentKey
    ) {
      return;
    }

    await this.reconcileTossPaymentStatus({
      orderId,
      paymentKey,
      status,
      totalAmount,
      approvedAt:
        typeof tossPayment.approvedAt === 'string'
          ? tossPayment.approvedAt
          : null,
    });
  }

  private async reconcileTossPaymentStatus(payment: {
    orderId: string;
    paymentKey: string;
    status: string;
    totalAmount: number;
    approvedAt: string | null;
  }): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepository = queryRunner.manager.getRepository(CoinOrder);
      const walletRepository = queryRunner.manager.getRepository(Wallet);
      const walletTransactionRepository =
        queryRunner.manager.getRepository(WalletTransaction);

      const order = await orderRepository.findOne({
        where: { orderCode: payment.orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order || payment.totalAmount !== order.amount) {
        await queryRunner.commitTransaction();
        return;
      }
      if (order.paymentKey && order.paymentKey !== payment.paymentKey) {
        await queryRunner.commitTransaction();
        return;
      }

      if (payment.status === 'DONE') {
        await this.applyTossWebhookCompletedOrder(
          order,
          payment,
          orderRepository,
          walletRepository,
          walletTransactionRepository,
        );
        await queryRunner.commitTransaction();
        return;
      }

      if (payment.status === 'CANCELED') {
        await this.applyTossWebhookCancelledOrder(
          order,
          payment.paymentKey,
          orderRepository,
          walletRepository,
          walletTransactionRepository,
        );
        await queryRunner.commitTransaction();
        return;
      }

      if (
        order.status === PaymentStatus.PENDING &&
        ['ABORTED', 'EXPIRED'].includes(payment.status)
      ) {
        order.status = PaymentStatus.FAILED;
        order.paymentKey = payment.paymentKey;
        order.cancelReason = `Toss webhook status: ${payment.status}`;
        order.cancelledAt = new Date();
        await orderRepository.save(order);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async applyTossWebhookCompletedOrder(
    order: CoinOrder,
    payment: {
      paymentKey: string;
      approvedAt: string | null;
    },
    orderRepository: Repository<CoinOrder>,
    walletRepository: Repository<Wallet>,
    walletTransactionRepository: Repository<WalletTransaction>,
  ): Promise<void> {
    if (order.status === PaymentStatus.COMPLETED) {
      if (order.paymentKey !== payment.paymentKey) {
        order.paymentKey = payment.paymentKey;
        await orderRepository.save(order);
      }
      return;
    }

    if (order.status !== PaymentStatus.PENDING) {
      return;
    }

    const existingCharge = await walletTransactionRepository.findOne({
      where: {
        memberId: order.memberId,
        type: WalletTransactionType.CHARGE,
        sourceType: COIN_ORDER_SOURCE_TYPE,
        sourceId: order.id,
      },
    });

    if (!existingCharge) {
      let wallet = await walletRepository.findOne({
        where: { memberId: order.memberId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = walletRepository.create({
          memberId: order.memberId,
          balance: 0,
        });
      }

      wallet.balance += order.coinAmount;
      await walletRepository.save(wallet);

      await walletTransactionRepository.save(
        walletTransactionRepository.create({
          memberId: order.memberId,
          type: WalletTransactionType.CHARGE,
          coinAmount: order.coinAmount,
          cashAmount: order.amount,
          status: WalletTransactionStatus.COMPLETED,
          description: `${order.coinAmount}코인 충전`,
          sourceType: COIN_ORDER_SOURCE_TYPE,
          sourceId: order.id,
        }),
      );
    }

    order.status = PaymentStatus.COMPLETED;
    order.paymentKey = payment.paymentKey;
    order.approvedAt = payment.approvedAt
      ? new Date(payment.approvedAt)
      : new Date();
    await orderRepository.save(order);
  }

  private async applyTossWebhookCancelledOrder(
    order: CoinOrder,
    paymentKey: string,
    orderRepository: Repository<CoinOrder>,
    walletRepository: Repository<Wallet>,
    walletTransactionRepository: Repository<WalletTransaction>,
  ): Promise<void> {
    if (order.status === PaymentStatus.CANCELLED) {
      return;
    }

    if (order.status === PaymentStatus.COMPLETED) {
      const existingRefund = await walletTransactionRepository.findOne({
        where: {
          memberId: order.memberId,
          type: WalletTransactionType.REFUND,
          sourceType: COIN_ORDER_SOURCE_TYPE,
          sourceId: order.id,
        },
      });

      if (!existingRefund) {
        const wallet = await walletRepository.findOne({
          where: { memberId: order.memberId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }
        if (wallet.balance < order.coinAmount) {
          throw new BadRequestException(
            'Not enough coin balance to reconcile cancelled Toss payment',
          );
        }

        wallet.balance -= order.coinAmount;
        await walletRepository.save(wallet);

        await walletTransactionRepository.save(
          walletTransactionRepository.create({
            memberId: order.memberId,
            type: WalletTransactionType.REFUND,
            coinAmount: -order.coinAmount,
            cashAmount: order.amount,
            status: WalletTransactionStatus.COMPLETED,
            description: `${order.coinAmount}코인 결제 취소`,
            sourceType: COIN_ORDER_SOURCE_TYPE,
            sourceId: order.id,
          }),
        );
      }
    } else if (
      ![PaymentStatus.PENDING, PaymentStatus.FAILED].includes(order.status)
    ) {
      return;
    }

    order.status = PaymentStatus.CANCELLED;
    order.paymentKey = paymentKey;
    order.cancelReason = 'Toss webhook status: CANCELED';
    order.cancelledAt = new Date();
    await orderRepository.save(order);
  }

  private async getOrCreateWallet(memberId: number): Promise<Wallet> {
    await this.assertMemberExists(memberId);

    const existingWallet = await this.walletRepository.findOne({
      where: { memberId },
    });
    if (existingWallet) {
      return existingWallet;
    }

    return this.walletRepository.save(
      this.walletRepository.create({
        memberId,
        balance: 0,
      }),
    );
  }

  private async assertMemberExists(memberId: number): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
  }

  private assertAdmin(member: Member): void {
    if (member.role !== MemberRole.ROLE_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private async assertCoinProductUniqueness(
    coinAmount: number,
    productId: number | null,
  ): Promise<void> {
    const existingProduct = await this.coinProductRepository.findOne({
      where: { coinAmount },
    });
    if (existingProduct && existingProduct.id !== productId) {
      throw new BadRequestException(
        'Coin product with same amount already exists',
      );
    }
  }

  private mapCoinProduct(product: CoinProduct): CoinProductResponseDto {
    return new CoinProductResponseDto(
      product.id,
      product.name,
      product.coinAmount,
      product.price,
      product.displayOrder,
      product.description,
      product.isActive,
    );
  }

  private mapCoinOrder(
    order: CoinOrder,
    product?: CoinProduct,
  ): CoinOrderResponseDto {
    return new CoinOrderResponseDto(
      order.id,
      order.orderCode,
      order.coinProductId,
      product?.name ?? '',
      order.coinAmount,
      order.amount,
      order.paymentMethod,
      order.status,
      order.paymentKey ?? null,
      order.approvedAt ?? null,
      order.cancelReason ?? null,
      order.member?.id ?? order.memberId ?? null,
      order.member?.nickname ?? null,
      order.member?.email ?? null,
      order.member?.profile?.profileUrl ?? null,
      order.cancelledAt ?? null,
      order.createdAt,
    );
  }

  private createWalletBalanceMismatchQuery() {
    const transactionSum = 'COALESCE(SUM(walletTransaction.coin_amount), 0)';
    const difference = `wallet.balance - ${transactionSum}`;

    return this.walletRepository
      .createQueryBuilder('wallet')
      .leftJoin(Member, 'member', 'member.id = wallet.member_id')
      .leftJoin(
        WalletTransaction,
        'walletTransaction',
        'walletTransaction.member_id = wallet.member_id AND walletTransaction.status = :completedStatus',
        { completedStatus: WalletTransactionStatus.COMPLETED },
      )
      .select('wallet.member_id', 'memberId')
      .addSelect('member.email', 'memberEmail')
      .addSelect('member.nickname', 'memberNickname')
      .addSelect('wallet.balance', 'walletBalance')
      .addSelect(transactionSum, 'transactionBalance')
      .addSelect(difference, 'difference')
      .groupBy('wallet.id')
      .addGroupBy('wallet.member_id')
      .addGroupBy('wallet.balance')
      .addGroupBy('member.email')
      .addGroupBy('member.nickname')
      .having(`${difference} <> 0`)
      .orderBy(`ABS(${difference})`, 'DESC')
      .addOrderBy('wallet.member_id', 'ASC');
  }

  private createWalletTransactionSourceDuplicateQuery() {
    return this.walletTransactionRepository
      .createQueryBuilder('walletTransaction')
      .leftJoin(Member, 'member', 'member.id = walletTransaction.member_id')
      .select('walletTransaction.member_id', 'memberId')
      .addSelect('member.email', 'memberEmail')
      .addSelect('member.nickname', 'memberNickname')
      .addSelect('walletTransaction.type', 'type')
      .addSelect('walletTransaction.source_type', 'sourceType')
      .addSelect('walletTransaction.source_id', 'sourceId')
      .addSelect('COUNT(walletTransaction.id)', 'transactionCount')
      .addSelect(
        'COALESCE(SUM(walletTransaction.coin_amount), 0)',
        'coinAmountSum',
      )
      .addSelect('MIN(walletTransaction.created_at)', 'firstCreatedAt')
      .addSelect('MAX(walletTransaction.created_at)', 'lastCreatedAt')
      .where('walletTransaction.source_type IS NOT NULL')
      .andWhere('walletTransaction.source_id IS NOT NULL')
      .groupBy('walletTransaction.member_id')
      .addGroupBy('member.email')
      .addGroupBy('member.nickname')
      .addGroupBy('walletTransaction.type')
      .addGroupBy('walletTransaction.source_type')
      .addGroupBy('walletTransaction.source_id')
      .having('COUNT(walletTransaction.id) > 1')
      .orderBy('COUNT(walletTransaction.id)', 'DESC')
      .addOrderBy('walletTransaction.member_id', 'ASC');
  }

  private mapWalletBalanceMismatch(
    raw: WalletBalanceMismatchRaw,
  ): WalletBalanceMismatchResponseDto {
    return new WalletBalanceMismatchResponseDto(
      this.toNumber(raw.memberId),
      raw.memberEmail ?? null,
      raw.memberNickname ?? null,
      this.toNumber(raw.walletBalance),
      this.toNumber(raw.transactionBalance),
      this.toNumber(raw.difference),
    );
  }

  private mapWalletTransactionSourceDuplicate(
    raw: WalletTransactionSourceDuplicateRaw,
  ): WalletTransactionSourceDuplicateResponseDto {
    return new WalletTransactionSourceDuplicateResponseDto(
      this.toNumber(raw.memberId),
      raw.memberEmail ?? null,
      raw.memberNickname ?? null,
      raw.type,
      raw.sourceType,
      this.toNumber(raw.sourceId),
      this.toNumber(raw.transactionCount),
      this.toNumber(raw.coinAmountSum),
      this.toDate(raw.firstCreatedAt),
      this.toDate(raw.lastCreatedAt),
    );
  }

  private toNumber(value: string | number | null): number {
    if (value === null) {
      return 0;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private toDate(value: string | Date | null): Date | null {
    if (!value) {
      return null;
    }

    return value instanceof Date ? value : new Date(value);
  }

  private generateOrderCode(): string {
    return `coin-order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
