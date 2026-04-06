import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Member } from './member.entity';

@Entity('wallet')
export class Wallet extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id', unique: true })
  memberId: number;

  @Column({ default: 0 })
  balance: number;

  @OneToOne(() => Member, (member) => member.wallet)
  @JoinColumn({ name: 'member_id' })
  member: Member;
}
