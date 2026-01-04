import { ApiProperty } from '@nestjs/swagger';

export class ContentsDto {
  @ApiProperty({ description: '게시글 ID', example: 1 })
  contentId: number;

  @ApiProperty({ description: '생성일', example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: '이미지 URL 목록',
    example: ['https://example.com/image1.jpg'],
  })
  imageUrls: string[];

  @ApiProperty({ description: '태그 목록', example: ['그림', '일러스트'] })
  tags: string[];

  @ApiProperty({ description: '설명', example: '멋진 그림입니다.' })
  explanation: string;

  @ApiProperty({ description: '소요 시간', example: '1시간' })
  timeTaken: string; // Enum?

  @ApiProperty({ description: '가격', example: 10000 })
  price: number;

  @ApiProperty({ description: '좋아요 수', example: 10 })
  likeCount: number;

  constructor(
    contentId: number,
    createdAt: Date,
    imageUrls: string[],
    tags: string[],
    explanation: string,
    timeTaken: string,
    price: number,
    likeCount: number,
  ) {
    this.contentId = contentId;
    this.createdAt = createdAt;
    this.imageUrls = imageUrls;
    this.tags = tags;
    this.explanation = explanation;
    this.timeTaken = timeTaken;
    this.price = price;
    this.likeCount = likeCount;
  }
}
