import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { WithdrawRequestStatus } from '../common/enums';
import { Member } from './member.entity';
import { WithdrawAccount } from './withdraw-account.entity';

@Entity('withdraw_request')
export class WithdrawRequest extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({ name: 'withdraw_account_id' })
  withdrawAccountId: number;

  @Column({ name: 'coin_amount' })
  coinAmount: number;

  @Column({ name: 'cash_amount' })
  cashAmount: number;

  @Column({ name: 'fee_amount', default: 0 })
  feeAmount: number;

  @Column({
    type: 'enum',
    enum: WithdrawRequestStatus,
  })
  status: WithdrawRequestStatus;

  @Column({ nullable: true })
  reason: string | null;

  @Column({ name: 'processed_at', nullable: true })
  processedAt: Date | null;

  @Column({ name: 'admin_id', nullable: true })
  adminId: number | null;

  @ManyToOne(() => Member, (member) => member.withdrawRequests)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'admin_id' })
  admin: Member | null;

  @ManyToOne(
    () => WithdrawAccount,
    (withdrawAccount) => withdrawAccount.withdrawRequests,
  )
  @JoinColumn({ name: 'withdraw_account_id' })
  withdrawAccount: WithdrawAccount;
}
