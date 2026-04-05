import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import {
  MemberRole,
  WithdrawAccountStatus,
  WithdrawRequestStatus,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../common/enums';
import { Member } from '../entities/member.entity';
import { Wallet } from '../entities/wallet.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { WithdrawAccount } from '../entities/withdraw-account.entity';
import { WithdrawRequest } from '../entities/withdraw-request.entity';
import { WithdrawAdminQueryDto } from './dto/withdraw-admin-query.dto';
import { CreateWithdrawRequestDto } from './dto/create-withdraw-request.dto';
import { UpdateWithdrawRequestAdminDto } from './dto/update-withdraw-request-admin.dto';
import { WithdrawPolicyResponseDto } from './dto/withdraw-policy-response.dto';
import { WithdrawRequestResponseDto } from './dto/withdraw-request-response.dto';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(WithdrawAccount)
    private readonly withdrawAccountRepository: Repository<WithdrawAccount>,
    @InjectRepository(WithdrawRequest)
    private readonly withdrawRequestRepository: Repository<WithdrawRequest>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  getPolicy(): WithdrawPolicyResponseDto {
    const policy = this.getWithdrawPolicy();
    return new WithdrawPolicyResponseDto(
      policy.minimumCoinAmount,
      policy.coinUnit,
      policy.cashPerCoin,
      policy.flatFeeAmount,
    );
  }

  async create(
    memberId: number,
    dto: CreateWithdrawRequestDto,
  ): Promise<WithdrawRequestResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const member = await queryRunner.manager.getRepository(Member).findOne({
        where: { id: memberId },
      });
      if (!member) {
        throw new NotFoundException('Member not found');
      }

      const accountRepository =
        queryRunner.manager.getRepository(WithdrawAccount);
      const requestRepository =
        queryRunner.manager.getRepository(WithdrawRequest);
      const walletRepository = queryRunner.manager.getRepository(Wallet);
      const walletTransactionRepository =
        queryRunner.manager.getRepository(WalletTransaction);

      const withdrawAccount = dto.withdrawAccountId
        ? await accountRepository.findOne({
            where: {
              id: dto.withdrawAccountId,
              memberId,
              status: WithdrawAccountStatus.ACTIVE,
            },
          })
        : await accountRepository.findOne({
            where: {
              memberId,
              isPrimary: true,
              status: WithdrawAccountStatus.ACTIVE,
            },
          });

      if (!withdrawAccount) {
        throw new NotFoundException('Active withdraw account not found');
      }
      if (!withdrawAccount.verifiedAt) {
        throw new BadRequestException('Withdraw account is not verified');
      }

      const policy = this.getWithdrawPolicy();
      if (dto.coinAmount < policy.minimumCoinAmount) {
        throw new BadRequestException(
          `Minimum withdraw coin amount is ${policy.minimumCoinAmount}`,
        );
      }
      if (dto.coinAmount % policy.coinUnit !== 0) {
        throw new BadRequestException(
          `Withdraw coin amount must be in units of ${policy.coinUnit}`,
        );
      }

      const wallet = await walletRepository.findOne({ where: { memberId } });
      if (!wallet || wallet.balance < dto.coinAmount) {
        throw new BadRequestException('Not enough coin balance');
      }

      const grossCashAmount = dto.coinAmount * policy.cashPerCoin;
      const cashAmount = grossCashAmount - policy.flatFeeAmount;
      if (cashAmount <= 0) {
        throw new BadRequestException('Withdraw amount is too small after fee');
      }

      wallet.balance -= dto.coinAmount;
      await walletRepository.save(wallet);

      const withdrawRequest = await requestRepository.save(
        requestRepository.create({
          memberId,
          withdrawAccountId: withdrawAccount.id,
          coinAmount: dto.coinAmount,
          cashAmount,
          feeAmount: policy.flatFeeAmount,
          status: WithdrawRequestStatus.REQUESTED,
          reason: null,
        }),
      );

      await walletTransactionRepository.save(
        walletTransactionRepository.create({
          memberId,
          type: WalletTransactionType.WITHDRAW_REQUEST,
          coinAmount: -dto.coinAmount,
          cashAmount,
          status: WalletTransactionStatus.COMPLETED,
          description: `${dto.coinAmount}코인 환전 신청`,
          sourceType: 'WITHDRAW_REQUEST',
          sourceId: withdrawRequest.id,
        }),
      );

      await queryRunner.commitTransaction();

      return this.findOne(memberId, withdrawRequest.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findMine(memberId: number): Promise<WithdrawRequestResponseDto[]> {
    await this.assertMemberExists(memberId);

    const requests = await this.withdrawRequestRepository.find({
      where: { memberId },
      relations: ['withdrawAccount'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((request) => this.mapRequest(request));
  }

  async findOne(
    memberId: number,
    requestId: number,
  ): Promise<WithdrawRequestResponseDto> {
    const request = await this.withdrawRequestRepository.findOne({
      where: { id: requestId, memberId },
      relations: ['withdrawAccount'],
    });
    if (!request) {
      throw new NotFoundException('Withdraw request not found');
    }

    return this.mapRequest(request);
  }

  async findAllForAdmin(
    member: Member,
    query: WithdrawAdminQueryDto,
  ): Promise<WithdrawRequestResponseDto[]> {
    this.assertAdmin(member);

    const queryBuilder = this.withdrawRequestRepository
      .createQueryBuilder('withdrawRequest')
      .leftJoinAndSelect('withdrawRequest.withdrawAccount', 'withdrawAccount')
      .leftJoin('withdrawRequest.member', 'member')
      .orderBy('withdrawRequest.createdAt', 'DESC');

    if (query.status) {
      queryBuilder.andWhere('withdrawRequest.status = :status', {
        status: query.status,
      });
    }

    if (query.memberId) {
      queryBuilder.andWhere('withdrawRequest.memberId = :memberId', {
        memberId: query.memberId,
      });
    }

    if (query.bankCode) {
      queryBuilder.andWhere('withdrawAccount.bankCode = :bankCode', {
        bankCode: query.bankCode,
      });
    }

    const keyword = query.keyword?.trim();
    if (keyword) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('member.nickname LIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('member.email LIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('withdrawAccount.accountHolder LIKE :keyword', {
              keyword: `%${keyword}%`,
            })
            .orWhere('withdrawAccount.accountNumberMasked LIKE :keyword', {
              keyword: `%${keyword}%`,
            })
            .orWhere('withdrawAccount.bankName LIKE :keyword', {
              keyword: `%${keyword}%`,
            });
        }),
      );
    }

    const requests = await queryBuilder.getMany();

    return requests.map((request) => this.mapRequest(request));
  }

  async updateByAdmin(
    member: Member,
    requestId: number,
    dto: UpdateWithdrawRequestAdminDto,
  ): Promise<WithdrawRequestResponseDto> {
    this.assertAdmin(member);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const requestRepository =
        queryRunner.manager.getRepository(WithdrawRequest);
      const walletRepository = queryRunner.manager.getRepository(Wallet);
      const walletTransactionRepository =
        queryRunner.manager.getRepository(WalletTransaction);

      const request = await requestRepository.findOne({
        where: { id: requestId },
        relations: ['withdrawAccount'],
      });
      if (!request) {
        throw new NotFoundException('Withdraw request not found');
      }

      if (
        request.status === WithdrawRequestStatus.REJECTED ||
        request.status === WithdrawRequestStatus.COMPLETED ||
        request.status === WithdrawRequestStatus.CANCELLED
      ) {
        throw new BadRequestException('Withdraw request is already finalized');
      }

      request.adminId = member.id;
      request.reason = dto.reason?.trim() ?? request.reason;

      if (dto.status === WithdrawRequestStatus.REJECTED) {
        const wallet = await walletRepository.findOne({
          where: { memberId: request.memberId },
        });
        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        wallet.balance += request.coinAmount;
        await walletRepository.save(wallet);

        await walletTransactionRepository.save(
          walletTransactionRepository.create({
            memberId: request.memberId,
            type: WalletTransactionType.WITHDRAW_CANCEL,
            coinAmount: request.coinAmount,
            cashAmount: request.cashAmount,
            status: WalletTransactionStatus.COMPLETED,
            description: `${request.coinAmount}코인 환전 반려 복구`,
            sourceType: 'WITHDRAW_REQUEST',
            sourceId: request.id,
          }),
        );

        request.status = WithdrawRequestStatus.REJECTED;
        request.processedAt = new Date();
      } else if (dto.status === WithdrawRequestStatus.APPROVED) {
        request.status = WithdrawRequestStatus.APPROVED;
      } else if (dto.status === WithdrawRequestStatus.COMPLETED) {
        request.status = WithdrawRequestStatus.COMPLETED;
        request.processedAt = new Date();

        await walletTransactionRepository.save(
          walletTransactionRepository.create({
            memberId: request.memberId,
            type: WalletTransactionType.WITHDRAW_COMPLETE,
            coinAmount: 0,
            cashAmount: request.cashAmount,
            status: WalletTransactionStatus.COMPLETED,
            description: `${request.coinAmount}코인 환전 완료`,
            sourceType: 'WITHDRAW_REQUEST',
            sourceId: request.id,
          }),
        );
      } else {
        throw new BadRequestException('Unsupported withdraw request status');
      }

      const savedRequest = await requestRepository.save(request);
      await queryRunner.commitTransaction();

      return this.mapRequest(savedRequest);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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

  private mapRequest(request: WithdrawRequest): WithdrawRequestResponseDto {
    return new WithdrawRequestResponseDto(
      request.id,
      request.withdrawAccountId,
      request.withdrawAccount?.bankName ?? '',
      request.withdrawAccount?.accountNumberMasked ?? '',
      request.coinAmount,
      request.cashAmount,
      request.feeAmount,
      request.status,
      request.reason ?? null,
      request.processedAt ?? null,
      request.createdAt,
    );
  }

  private getWithdrawPolicy(): {
    minimumCoinAmount: number;
    coinUnit: number;
    cashPerCoin: number;
    flatFeeAmount: number;
  } {
    const minimumCoinAmount = Number(
      this.configService.get<string>('WITHDRAW_MINIMUM_COIN_AMOUNT') ?? '10',
    );
    const coinUnit = Number(
      this.configService.get<string>('WITHDRAW_COIN_UNIT') ?? '10',
    );
    const cashPerCoin = Number(
      this.configService.get<string>('WITHDRAW_CASH_PER_COIN') ?? '100',
    );
    const flatFeeAmount = Number(
      this.configService.get<string>('WITHDRAW_FLAT_FEE_AMOUNT') ?? '0',
    );

    return {
      minimumCoinAmount,
      coinUnit,
      cashPerCoin,
      flatFeeAmount,
    };
  }
}
