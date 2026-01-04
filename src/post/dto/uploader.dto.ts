import { ApiProperty } from '@nestjs/swagger';

export class UploaderDto {
  @ApiProperty({ description: '닉네임', example: '홍길동' })
  nickname: string;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://example.com/image.jpg',
  })
  profileImageUrl: string;

  @ApiProperty({ description: '그림 개수', example: 10 })
  drawingCount: number;

  @ApiProperty({ description: '리뷰 개수', example: 5 })
  reviewCount: number;

  @ApiProperty({ description: '별점', example: 4.5 })
  star: number;

  constructor(
    nickname: string,
    profileImageUrl: string,
    drawingCount: number,
    reviewCount: number,
    star: number,
  ) {
    this.nickname = nickname;
    this.profileImageUrl = profileImageUrl;
    this.drawingCount = drawingCount;
    this.reviewCount = reviewCount;
    this.star = star;
  }
}
