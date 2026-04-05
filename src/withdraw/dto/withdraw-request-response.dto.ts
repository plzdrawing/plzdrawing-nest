import { ApiProperty } from '@nestjs/swagger';
import { WithdrawRequestStatus } from '../../common/enums';

export class WithdrawRequestResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  withdrawAccountId: number;

  @ApiProperty({ example: '국민은행' })
  bankName: string;

  @ApiProperty({ example: '123456******34' })
  accountNumberMasked: string;

  @ApiProperty({ example: 10 })
  coinAmount: number;

  @ApiProperty({ example: 10 })
  cashAmount: number;

  @ApiProperty({ example: 0 })
  feeAmount: number;

  @ApiProperty({
    enum: WithdrawRequestStatus,
    example: WithdrawRequestStatus.REQUESTED,
  })
  status: WithdrawRequestStatus;

  @ApiProperty({ example: null, nullable: true })
  reason: string | null;

  @ApiProperty({ example: null, nullable: true })
  processedAt: Date | null;

  @ApiProperty({ example: '2026-04-05 10:00:00' })
  createdAt: Date;

  constructor(
    id: number,
    withdrawAccountId: number,
    bankName: string,
    accountNumberMasked: string,
    coinAmount: number,
    cashAmount: number,
    feeAmount: number,
    status: WithdrawRequestStatus,
    reason: string | null,
    processedAt: Date | null,
    createdAt: Date,
  ) {
    this.id = id;
    this.withdrawAccountId = withdrawAccountId;
    this.bankName = bankName;
    this.accountNumberMasked = accountNumberMasked;
    this.coinAmount = coinAmount;
    this.cashAmount = cashAmount;
    this.feeAmount = feeAmount;
    this.status = status;
    this.reason = reason;
    this.processedAt = processedAt;
    this.createdAt = createdAt;
  }
}
