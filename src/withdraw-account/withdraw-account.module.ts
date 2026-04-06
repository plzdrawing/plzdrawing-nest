import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../entities/member.entity';
import { WithdrawAccount } from '../entities/withdraw-account.entity';
import { WithdrawAccountController } from './withdraw-account.controller';
import { WithdrawAccountService } from './withdraw-account.service';

@Module({
  imports: [TypeOrmModule.forFeature([Member, WithdrawAccount])],
  controllers: [WithdrawAccountController],
  providers: [WithdrawAccountService],
  exports: [WithdrawAccountService],
})
export class WithdrawAccountModule {}
