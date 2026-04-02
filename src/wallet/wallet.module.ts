import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoinProduct } from '../entities/coin-product.entity';
import { Member } from '../entities/member.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, Wallet, WalletTransaction, CoinProduct]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
