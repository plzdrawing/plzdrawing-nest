import { ApiProperty } from '@nestjs/swagger';
import {
  WalletTransactionStatus,
  WalletTransactionType,
} from '../../common/enums';

export class WalletTransactionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    enum: WalletTransactionType,
    example: WalletTransactionType.CHARGE,
  })
  type: WalletTransactionType;

  @ApiProperty({ example: 10 })
  coinAmount: number;

  @ApiProperty({ example: 1200, nullable: true })
  cashAmount: number | null;

  @ApiProperty({
    enum: WalletTransactionStatus,
    example: WalletTransactionStatus.COMPLETED,
  })
  status: WalletTransactionStatus;

  @ApiProperty({ example: '10코인 충전', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'COIN_PRODUCT', nullable: true })
  sourceType: string | null;

  @ApiProperty({ example: 1, nullable: true })
  sourceId: number | null;

  @ApiProperty({ example: '2026-04-02 10:00:00' })
  createdAt: Date;

  constructor(
    id: number,
    type: WalletTransactionType,
    coinAmount: number,
    cashAmount: number | null,
    status: WalletTransactionStatus,
    description: string | null,
    sourceType: string | null,
    sourceId: number | null,
    createdAt: Date,
  ) {
    this.id = id;
    this.type = type;
    this.coinAmount = coinAmount;
    this.cashAmount = cashAmount;
    this.status = status;
    this.description = description;
    this.sourceType = sourceType;
    this.sourceId = sourceId;
    this.createdAt = createdAt;
  }
}
