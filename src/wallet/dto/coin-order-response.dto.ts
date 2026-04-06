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

  @ApiProperty({
    example: '사용자 요청에 의한 결제 취소',
    nullable: true,
  })
  cancelReason: string | null;

  @ApiProperty({ example: 15, nullable: true })
  memberId: number | null;

  @ApiProperty({ example: '그림좋아', nullable: true })
  memberNickname: string | null;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  memberEmail: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/profile.png',
    nullable: true,
  })
  memberProfileUrl: string | null;

  @ApiProperty({
    example: '2026-04-05 10:10:00',
    nullable: true,
  })
  cancelledAt: Date | null;

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
    cancelReason: string | null,
    memberId: number | null,
    memberNickname: string | null,
    memberEmail: string | null,
    memberProfileUrl: string | null,
    cancelledAt: Date | null,
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
    this.cancelReason = cancelReason;
    this.memberId = memberId;
    this.memberNickname = memberNickname;
    this.memberEmail = memberEmail;
    this.memberProfileUrl = memberProfileUrl;
    this.cancelledAt = cancelledAt;
    this.createdAt = createdAt;
  }
}
