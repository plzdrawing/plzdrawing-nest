import { ApiProperty } from '@nestjs/swagger';

export class WithdrawPolicyResponseDto {
  @ApiProperty({ example: 10 })
  minimumCoinAmount: number;

  @ApiProperty({ example: 10 })
  coinUnit: number;

  @ApiProperty({ example: 100 })
  cashPerCoin: number;

  @ApiProperty({ example: 500 })
  flatFeeAmount: number;

  constructor(
    minimumCoinAmount: number,
    coinUnit: number,
    cashPerCoin: number,
    flatFeeAmount: number,
  ) {
    this.minimumCoinAmount = minimumCoinAmount;
    this.coinUnit = coinUnit;
    this.cashPerCoin = cashPerCoin;
    this.flatFeeAmount = flatFeeAmount;
  }
}
