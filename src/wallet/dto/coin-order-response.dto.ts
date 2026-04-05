import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '../../common/enums';

export class CoinOrderResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'coin-order-20260405-abc123' })
  orderCode: string;

  @ApiProperty({ example: 1 })
  coinProductId: number;

  @ApiProperty({ example: '그리코인 10개' })
  productName: string;

  @ApiProperty({ example: 10 })
  coinAmount: number;

  @ApiProperty({ example: 1200 })
  amount: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.TOSS_PAY,
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @ApiProperty({
    example: 'toss_payment_key_sample',
    nullable: true,
  })
  paymentKey: string | null;

  @ApiProperty({
    example: '2026-04-05 10:00:00',
    nullable: true,
  })
  approvedAt: Date | null;

  @ApiProperty({ example: '2026-04-05 09:59:00' })
  createdAt: Date;

  constructor(
    id: number,
    orderCode: string,
    coinProductId: number,
    productName: string,
    coinAmount: number,
    amount: number,
    paymentMethod: PaymentMethod,
    status: PaymentStatus,
    paymentKey: string | null,
    approvedAt: Date | null,
    createdAt: Date,
  ) {
    this.id = id;
    this.orderCode = orderCode;
    this.coinProductId = coinProductId;
    this.productName = productName;
    this.coinAmount = coinAmount;
    this.amount = amount;
    this.paymentMethod = paymentMethod;
    this.status = status;
    this.paymentKey = paymentKey;
    this.approvedAt = approvedAt;
    this.createdAt = createdAt;
  }
}
