import { ApiProperty } from '@nestjs/swagger';

export class WalletSummaryResponseDto {
  @ApiProperty({ example: 0 })
  balance: number;

  constructor(balance: number) {
    this.balance = balance;
  }
}
