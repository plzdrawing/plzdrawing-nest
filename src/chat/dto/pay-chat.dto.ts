import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PaymentMethod } from '../../common/enums';

export class PayChatDto {
  @ApiProperty({
    description: '결제 수단',
    enum: PaymentMethod,
    example: PaymentMethod.KAKAO_PAY,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
