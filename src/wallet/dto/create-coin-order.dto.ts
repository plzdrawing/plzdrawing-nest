import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '../../common/enums';

export class CreateCoinOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  coinProductId: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.TOSS_PAY,
    default: PaymentMethod.TOSS_PAY,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod = PaymentMethod.TOSS_PAY;
}
