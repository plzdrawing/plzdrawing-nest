import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentHistory } from './payment-history.entity';

@Entity('refund_history')
export class RefundHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  amount: number;

  @Column({ name: 'refunded_at', nullable: true })
  refundedAt: Date;

  @Column({ name: 'payment_id' })
  paymentId: number;

  @ManyToOne(() => PaymentHistory, (payment) => payment.refunds)
  @JoinColumn({ name: 'payment_id' })
  payment: PaymentHistory;
}
