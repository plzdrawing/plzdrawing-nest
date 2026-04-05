import { ApiProperty } from '@nestjs/swagger';
import { WithdrawAccountStatus } from '../../common/enums';

export class WithdrawAccountResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '004' })
  bankCode: string;

  @ApiProperty({ example: '국민은행' })
  bankName: string;

  @ApiProperty({ example: '홍길동' })
  accountHolder: string;

  @ApiProperty({ example: '123456******34' })
  accountNumberMasked: string;

  @ApiProperty({ example: true })
  isPrimary: boolean;

  @ApiProperty({
    enum: WithdrawAccountStatus,
    example: WithdrawAccountStatus.ACTIVE,
  })
  status: WithdrawAccountStatus;

  @ApiProperty({ example: '2026-04-05 10:00:00', nullable: true })
  verifiedAt: Date | null;

  @ApiProperty({ example: '2026-04-05 09:59:00' })
  createdAt: Date;

  constructor(
    id: number,
    bankCode: string,
    bankName: string,
    accountHolder: string,
    accountNumberMasked: string,
    isPrimary: boolean,
    status: WithdrawAccountStatus,
    verifiedAt: Date | null,
    createdAt: Date,
  ) {
    this.id = id;
    this.bankCode = bankCode;
    this.bankName = bankName;
    this.accountHolder = accountHolder;
    this.accountNumberMasked = accountNumberMasked;
    this.isPrimary = isPrimary;
    this.status = status;
    this.verifiedAt = verifiedAt;
    this.createdAt = createdAt;
  }
}
