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
    memberId: number | null,
    memberNickname: string | null,
    memberEmail: string | null,
    memberProfileUrl: string | null,
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
    this.memberId = memberId;
    this.memberNickname = memberNickname;
    this.memberEmail = memberEmail;
    this.memberProfileUrl = memberProfileUrl;
    this.isPrimary = isPrimary;
    this.status = status;
    this.verifiedAt = verifiedAt;
    this.createdAt = createdAt;
  }
}
