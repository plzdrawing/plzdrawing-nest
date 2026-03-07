import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class AcceptChatDto {
  @ApiProperty({ description: '견적 금액 (코인)', example: 500 })
  @IsInt()
  @Min(1)
  price: number;

  @ApiProperty({
    description: '예상 완료일 (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  @IsDateString()
  estimatedAt: string;

  @ApiProperty({ description: '수정 허용 횟수', example: 2 })
  @IsInt()
  @Min(1)
  @Max(10)
  feedbackCount: number;
}
