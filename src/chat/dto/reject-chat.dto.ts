import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RejectChatDto {
  @ApiPropertyOptional({
    description: '거절 사유 키워드 목록 (최대 3개)',
    example: ['스타일이 달라요', '다른 작업중이에요'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  reasons?: string[];

  @ApiPropertyOptional({
    description: '자유 거절 사유 (0~200자)',
    example: '지금은 작업이 많아서요.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reasonText?: string;
}
