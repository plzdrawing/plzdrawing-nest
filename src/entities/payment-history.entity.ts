import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { PaymentMethod, PaymentStatus, PaymentType } from '../common/enums';
import { Member } from './member.entity';
import { RefundHistory } from './refund-history.entity';

@Entity('payment_history')
export class PaymentHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sender_id' })
  senderId: number;

  @Column({ name: 'receiver_id' })
  receiverId: number;

  @Column({ nullable: true })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    nullable: true,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentType,
    nullable: true,
  })
  type: PaymentType;

  @Column({ name: 'chat_room_id', nullable: true })
  chatRoomId: number;

  @ManyToOne(() => Member, (member) => member.sentPayments)
  @JoinColumn({ name: 'sender_id' })
  sender: Member;

  @ManyToOne(() => Member, (member) => member.receivedPayments)
  @JoinColumn({ name: 'receiver_id' })
  receiver: Member;

  @OneToMany(() => RefundHistory, (refund) => refund.payment)
  refunds: RefundHistory[];
}
