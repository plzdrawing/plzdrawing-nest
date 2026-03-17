import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ReviewStar } from '../../common/enums';

export class CreateReviewDto {
  @ApiProperty({ description: '채팅방 ID', example: 1 })
  @IsInt()
  chatRoomId: number;

  @ApiProperty({
    description: '별점',
    enum: ReviewStar,
    example: ReviewStar.FIVE,
  })
  @IsEnum(ReviewStar)
  star: ReviewStar;

  @ApiPropertyOptional({
    description: '리뷰 키워드 목록 (최대 3개)',
    example: ['귀여워요', '친절해요', '섬세해요'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: '자유 후기 (0~200자)',
    example: '요청사항을 너무 잘 들어주세요!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  content?: string;

  @ApiPropertyOptional({
    description: '후기 이미지 object key 목록 (최대 3개)',
    example: ['review/1/2026/03/uuid1.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  imageObjectKeys?: string[];
}
