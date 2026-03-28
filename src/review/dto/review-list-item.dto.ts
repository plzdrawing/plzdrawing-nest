import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStar } from '../../common/enums';

export class ReviewListItemDto {
  @ApiProperty({ description: '리뷰 ID', example: 1 })
  reviewId: number;

  @ApiProperty({ description: '게시글 ID', example: 10 })
  postId: number;

  @ApiProperty({ description: '작성자 ID', example: 5 })
  writerId: number;

  @ApiProperty({ description: '작성자 닉네임', example: '홍길동' })
  writerNickname: string;

  @ApiProperty({
    description: '별점',
    enum: ReviewStar,
    example: ReviewStar.FIVE,
  })
  star: ReviewStar;

  @ApiPropertyOptional({
    description: '후기 내용',
    example: '정말 만족했어요!',
  })
  content?: string;

  @ApiProperty({
    description: '키워드 목록',
    type: [String],
    example: ['친절해요'],
  })
  keywords: string[];

  @ApiProperty({
    description: '리뷰 이미지 object key 목록',
    type: [String],
    example: ['review/1/2026/03/uuid1.jpg'],
  })
  imageObjectKeys: string[];

  @ApiProperty({ description: '게시글 좋아요 수', example: 23 })
  likeCount: number;

  @ApiProperty({ description: '내가 찜한 게시글인지 여부', example: true })
  isScrapped: boolean;

  @ApiProperty({ description: '작성일시' })
  createdAt: Date;
}
