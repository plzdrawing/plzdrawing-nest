import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '../../common/enums';

export class PayChatDto {
  @ApiPropertyOptional({
    description:
      '호환성 유지용 필드입니다. 채팅 결제는 코인 잔액으로만 처리되며 이 값은 결제 이력에 기록되지 않습니다.',
    enum: PaymentMethod,
    example: PaymentMethod.TOSS_PAY,
    deprecated: true,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
