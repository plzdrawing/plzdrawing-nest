import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class ReadChatDto {
  @ApiPropertyOptional({
    description: '마지막으로 읽은 메시지 ID',
    example: 150,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  lastReadMessageId?: number;
}
