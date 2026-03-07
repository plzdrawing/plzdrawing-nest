import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStar } from '../../common/enums';

export class ReviewResponseDto {
  @ApiProperty({ description: '리뷰 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '채팅방 ID', example: 1 })
  chatRoomId: number;

  @ApiProperty({
    description: '별점',
    enum: ReviewStar,
    example: ReviewStar.FIVE,
  })
  star: ReviewStar;

  @ApiPropertyOptional({ description: '자유 후기', example: '정말 만족해요!' })
  content?: string;

  @ApiPropertyOptional({
    description: '키워드 목록',
    example: ['귀여워요', '친절해요'],
    type: [String],
  })
  keywords?: string[];

  @ApiPropertyOptional({
    description: '이미지 object key 목록',
    type: [String],
  })
  imageObjectKeys?: string[];

  @ApiProperty({ description: '작성자 ID', example: 10 })
  writerId: number;

  @ApiProperty({ description: '수신자(그림쟁이) ID', example: 20 })
  receiverId: number;

  @ApiProperty({ description: '작성 일시' })
  createdAt: Date;
}
