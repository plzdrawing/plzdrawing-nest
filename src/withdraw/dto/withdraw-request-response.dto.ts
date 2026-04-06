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
    memberId: number | null,
    memberNickname: string | null,
    memberEmail: string | null,
    memberProfileUrl: string | null,
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
    this.memberId = memberId;
    this.memberNickname = memberNickname;
    this.memberEmail = memberEmail;
    this.memberProfileUrl = memberProfileUrl;
    this.coinAmount = coinAmount;
    this.cashAmount = cashAmount;
    this.feeAmount = feeAmount;
    this.status = status;
    this.reason = reason;
    this.processedAt = processedAt;
    this.createdAt = createdAt;
  }
}
