import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RequestPriceChangeDto {
  @ApiProperty({ description: '변경된 금액 (코인)', example: 700 })
  @IsInt()
  @Min(1)
  price: number;

  @ApiProperty({
    description: '예상 완료일 (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  @IsDateString()
  estimatedAt: string;

  @ApiProperty({ description: '수정 허용 횟수', example: 1 })
  @IsInt()
  @Min(1)
  @Max(10)
  feedbackCount: number;

  @ApiPropertyOptional({
    description: '금액 변경 사유 (0~200자)',
    example: '채색 작업이 추가되어 금액이 변경되었습니다.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
