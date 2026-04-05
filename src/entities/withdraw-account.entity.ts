import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WithdrawAccountStatus } from '../common/enums';
import { BaseEntity } from '../common/entities/base.entity';
import { Member } from './member.entity';

@Entity('withdraw_account')
export class WithdrawAccount extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({ name: 'bank_code' })
  bankCode: string;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ name: 'account_holder' })
  accountHolder: string;

  @Column({ name: 'account_number_masked' })
  accountNumberMasked: string;

  @Column({ name: 'account_number_encrypted', length: 1000 })
  accountNumberEncrypted: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({
    type: 'enum',
    enum: WithdrawAccountStatus,
    default: WithdrawAccountStatus.ACTIVE,
  })
  status: WithdrawAccountStatus;

  @Column({ name: 'verified_at', nullable: true })
  verifiedAt: Date | null;

  @ManyToOne(() => Member, (member) => member.withdrawAccounts)
  @JoinColumn({ name: 'member_id' })
  member: Member;
}
