import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferenceResponseDto {
  @ApiProperty({ example: true })
  allEnabled: boolean;

  @ApiProperty({ example: true })
  chatEnabled: boolean;

  @ApiProperty({ example: true })
  paymentEnabled: boolean;

  @ApiProperty({ example: false })
  marketingEnabled: boolean;

  constructor(
    allEnabled: boolean,
    chatEnabled: boolean,
    paymentEnabled: boolean,
    marketingEnabled: boolean,
  ) {
    this.allEnabled = allEnabled;
    this.chatEnabled = chatEnabled;
    this.paymentEnabled = paymentEnabled;
    this.marketingEnabled = marketingEnabled;
  }
}
