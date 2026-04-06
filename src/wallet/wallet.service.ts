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
import { WalletTransactionPageResponseDto } from './dto/wallet-transaction-page-response.dto';
import { WalletTransactionResponseDto } from './dto/wallet-transaction-response.dto';
import { TossPaymentsService } from './toss-payments.service';

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
      });
      if (!order) {
        throw new NotFoundException('Coin order not found');
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
          sourceType: 'COIN_ORDER',
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
      });
      if (!order) {
        throw new NotFoundException('Coin order not found');
      }
      if (order.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException(
          'Only completed coin orders can be cancelled',
        );
      }
      if (!order.paymentKey) {
        throw new BadRequestException('Payment key is missing');
      }

      const wallet = await walletRepository.findOne({ where: { memberId } });
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
          sourceType: 'COIN_ORDER',
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

    const orderId =
      typeof payload.data?.orderId === 'string' ? payload.data.orderId : null;
    const status =
      typeof payload.data?.status === 'string' ? payload.data.status : null;
    const paymentKey =
      typeof payload.data?.paymentKey === 'string'
        ? payload.data.paymentKey
        : null;
    const totalAmount =
      typeof payload.data?.totalAmount === 'number'
        ? payload.data.totalAmount
        : null;

    if (!orderId || !status) {
      return;
    }

    const order = await this.coinOrderRepository.findOne({
      where: { orderCode: orderId },
    });
    if (!order) {
      return;
    }

    if (totalAmount !== null && totalAmount !== order.amount) {
      return;
    }

    if (order.status !== PaymentStatus.PENDING) {
      return;
    }

    if (status === 'DONE') {
      if (paymentKey && order.paymentKey !== paymentKey) {
        order.paymentKey = paymentKey;
        await this.coinOrderRepository.save(order);
      }
      return;
    }

    if (status === 'CANCELED') {
      order.status = PaymentStatus.CANCELLED;
      order.paymentKey = paymentKey ?? order.paymentKey;
      order.cancelReason = `Toss webhook status: ${status}`;
      order.cancelledAt = new Date();
      await this.coinOrderRepository.save(order);
      return;
    }

    if (['ABORTED', 'EXPIRED'].includes(status)) {
      order.status = PaymentStatus.FAILED;
      order.paymentKey = paymentKey ?? order.paymentKey;
      order.cancelReason = `Toss webhook status: ${status}`;
      order.cancelledAt = new Date();
      await this.coinOrderRepository.save(order);
    }
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

  private generateOrderCode(): string {
    return `coin-order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
