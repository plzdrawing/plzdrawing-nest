import { ApiProperty } from '@nestjs/swagger';
import { PageResponseDto } from '../../common/dto/page-response.dto';
import { WalletTransactionType } from '../../common/enums';

export class WalletTransactionSourceDuplicateResponseDto {
  @ApiProperty({ example: 15 })
  memberId: number;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  memberEmail: string | null;

  @ApiProperty({ example: '그림좋아', nullable: true })
  memberNickname: string | null;

  @ApiProperty({
    enum: WalletTransactionType,
    example: WalletTransactionType.CHARGE,
  })
  type: WalletTransactionType;

  @ApiProperty({ example: 'COIN_ORDER' })
  sourceType: string;

  @ApiProperty({ example: 100 })
  sourceId: number;

  @ApiProperty({ example: 2 })
  transactionCount: number;

  @ApiProperty({ example: 20 })
  coinAmountSum: number;

  @ApiProperty({ example: '2026-06-22T09:00:00.000Z', nullable: true })
  firstCreatedAt: Date | null;

  @ApiProperty({ example: '2026-06-22T09:05:00.000Z', nullable: true })
  lastCreatedAt: Date | null;

  constructor(
    memberId: number,
    memberEmail: string | null,
    memberNickname: string | null,
    type: WalletTransactionType,
    sourceType: string,
    sourceId: number,
    transactionCount: number,
    coinAmountSum: number,
    firstCreatedAt: Date | null,
    lastCreatedAt: Date | null,
  ) {
    this.memberId = memberId;
    this.memberEmail = memberEmail;
    this.memberNickname = memberNickname;
    this.type = type;
    this.sourceType = sourceType;
    this.sourceId = sourceId;
    this.transactionCount = transactionCount;
    this.coinAmountSum = coinAmountSum;
    this.firstCreatedAt = firstCreatedAt;
    this.lastCreatedAt = lastCreatedAt;
  }
}

export class WalletTransactionSourceDuplicatePageResponseDto extends PageResponseDto<WalletTransactionSourceDuplicateResponseDto> {
  @ApiProperty({ type: [WalletTransactionSourceDuplicateResponseDto] })
  data: WalletTransactionSourceDuplicateResponseDto[];
}
