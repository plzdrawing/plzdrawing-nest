import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class MessageListQueryDto {
  @ApiPropertyOptional({ description: '이전 메시지 기준 ID', example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  beforeId?: number;

  @ApiPropertyOptional({ description: '이후 메시지 기준 ID', example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  afterId?: number;

  @ApiPropertyOptional({ description: '조회 개수', example: 30, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 30;
}
