import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class ConfirmCoinOrderDto {
  @ApiProperty({
    example: 'toss_payment_key_sample',
    description: '토스 결제 성공 후 전달받은 paymentKey',
  })
  @IsString()
  @MaxLength(255)
  paymentKey: string;

  @ApiProperty({
    example: 1200,
    description: '토스 결제 성공 후 전달받은 결제 금액',
  })
  @IsInt()
  @Min(0)
  amount: number;
}
