import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CoinProduct } from '../entities/coin-product.entity';
import { Member } from '../entities/member.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { CoinProductResponseDto } from './dto/coin-product-response.dto';
import { WalletSummaryResponseDto } from './dto/wallet-summary-response.dto';
import { WalletTransactionPageResponseDto } from './dto/wallet-transaction-page-response.dto';
import { WalletTransactionResponseDto } from './dto/wallet-transaction-response.dto';

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
        ),
    );
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
}
