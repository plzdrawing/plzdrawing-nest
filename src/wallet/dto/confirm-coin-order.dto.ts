import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmCoinOrderDto {
  @ApiPropertyOptional({
    example: 'toss_payment_key_sample',
    description: '실결제 연동 전까지는 선택값입니다.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentKey?: string;
}
