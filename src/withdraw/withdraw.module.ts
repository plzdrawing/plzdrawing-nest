import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../entities/member.entity';
import { Wallet } from '../entities/wallet.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { WithdrawAccount } from '../entities/withdraw-account.entity';
import { WithdrawRequest } from '../entities/withdraw-request.entity';
import { WithdrawController } from './withdraw.controller';
import { WithdrawService } from './withdraw.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      Wallet,
      WalletTransaction,
      WithdrawAccount,
      WithdrawRequest,
    ]),
  ],
  controllers: [WithdrawController],
  providers: [WithdrawService],
})
export class WithdrawModule {}
