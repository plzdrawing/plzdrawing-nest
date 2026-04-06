import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Member } from './member.entity';

@Entity('notification_preference')
export class NotificationPreference extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id', unique: true })
  memberId: number;

  @Column({ name: 'all_enabled', default: true })
  allEnabled: boolean;

  @Column({ name: 'chat_enabled', default: true })
  chatEnabled: boolean;

  @Column({ name: 'payment_enabled', default: true })
  paymentEnabled: boolean;

  @Column({ name: 'marketing_enabled', default: false })
  marketingEnabled: boolean;

  @OneToOne(() => Member, (member) => member.notificationPreference)
  @JoinColumn({ name: 'member_id' })
  member: Member;
}
