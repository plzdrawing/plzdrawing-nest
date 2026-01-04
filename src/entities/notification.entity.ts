import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '../common/enums';
import { Member } from './member.entity';

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({ name: 'sender_id' })
  senderId: number;

  @Column({ name: 'receiver_id' })
  receiverId: number;

  @Column({ nullable: true })
  title: string;

  @Column({ length: 500, nullable: true })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    nullable: true,
  })
  type: NotificationType;

  @Column({ nullable: true })
  link: string;

  @ManyToOne(() => Member, (member) => member.notifications)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => Member, (member) => member.sentNotifications)
  @JoinColumn({ name: 'sender_id' })
  sender: Member;

  @ManyToOne(() => Member, (member) => member.receivedNotifications)
  @JoinColumn({ name: 'receiver_id' })
  receiver: Member;
}
