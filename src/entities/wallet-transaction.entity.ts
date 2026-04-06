import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  WalletTransactionStatus,
  WalletTransactionType,
} from '../common/enums';
import { BaseEntity } from '../common/entities/base.entity';
import { Member } from './member.entity';

@Entity('wallet_transaction')
export class WalletTransaction extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({
    type: 'enum',
    enum: WalletTransactionType,
  })
  type: WalletTransactionType;

  @Column({ name: 'coin_amount' })
  coinAmount: number;

  @Column({ name: 'cash_amount', nullable: true })
  cashAmount: number | null;

  @Column({
    type: 'enum',
    enum: WalletTransactionStatus,
  })
  status: WalletTransactionStatus;

  @Column({ nullable: true })
  description: string | null;

  @Column({ name: 'source_type', nullable: true })
  sourceType: string | null;

  @Column({ name: 'source_id', nullable: true })
  sourceId: number | null;

  @ManyToOne(() => Member, (member) => member.walletTransactions)
  @JoinColumn({ name: 'member_id' })
  member: Member;
}
