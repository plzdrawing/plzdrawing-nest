import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { PaymentMethod, PaymentStatus } from '../common/enums';
import { CoinProduct } from './coin-product.entity';
import { Member } from './member.entity';

@Entity('coin_order')
export class CoinOrder extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({ name: 'coin_product_id' })
  coinProductId: number;

  @Column({ name: 'order_code', unique: true })
  orderCode: string;

  @Column({ name: 'coin_amount' })
  coinAmount: number;

  @Column()
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
  })
  status: PaymentStatus;

  @Column({ name: 'payment_key', nullable: true })
  paymentKey: string | null;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt: Date | null;

  @ManyToOne(() => Member, (member) => member.coinOrders)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => CoinProduct)
  @JoinColumn({ name: 'coin_product_id' })
  coinProduct: CoinProduct;
}
