import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChatRoomDto {
  @ApiProperty({ description: '게시글 ID', example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  postId: number;

  @ApiPropertyOptional({
    description: '요청 설명',
    example: '강아지 그림을 부탁드려요.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ description: '요청 금액', example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: '참고 이미지 object key 목록 (최대 5개)',
    type: [String],
    example: ['chat/request/1/2026/03/uuid1.png'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  referenceImageObjectKeys?: string[];
}
