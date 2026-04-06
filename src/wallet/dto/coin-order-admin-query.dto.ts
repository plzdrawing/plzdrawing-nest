import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaymentMethod, PaymentStatus } from '../../common/enums';

export class CoinOrderAdminQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: '회원 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  memberId?: number;

  @ApiPropertyOptional({
    description: '닉네임, 이메일, 주문번호, 상품명 검색',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
