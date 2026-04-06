import { ApiProperty } from '@nestjs/swagger';
import { PageResponseDto } from '../../common/dto/page-response.dto';

export class PublicReviewListItemDto {
  @ApiProperty({ description: '후기 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '별점(1~5)', example: 5 })
  starScore: number;

  @ApiProperty({
    description: '후기 내용',
    example: '요청사항 반영이 빨라서 만족해요!',
  })
  content: string;

  @ApiProperty({
    description: '후기 키워드 목록',
    type: [String],
    example: ['친절해요', '원하는 대로 그려줘요'],
  })
  keywords: string[];

  @ApiProperty({
    description: '후기 이미지 object key 목록',
    type: [String],
    example: ['review/1/2026/03/uuid1.jpg'],
  })
  imageObjectKeys: string[];

  @ApiProperty({ description: '후기 작성자 ID', example: 4 })
  writerId: number;

  @ApiProperty({ description: '후기 작성자 닉네임', example: '홍길동 님' })
  writerNickname: string;

  @ApiProperty({
    description: '후기 작성자 프로필 이미지 URL',
    example: 'https://example.com/profile.png',
    nullable: true,
  })
  writerProfileImageUrl: string | null;

  @ApiProperty({ description: '후기 작성일시' })
  createdAt: Date;

  constructor(
    id: number,
    starScore: number,
    content: string,
    keywords: string[],
    imageObjectKeys: string[],
    writerId: number,
    writerNickname: string,
    writerProfileImageUrl: string | null,
    createdAt: Date,
  ) {
    this.id = id;
    this.starScore = starScore;
    this.content = content;
    this.keywords = keywords;
    this.imageObjectKeys = imageObjectKeys;
    this.writerId = writerId;
    this.writerNickname = writerNickname;
    this.writerProfileImageUrl = writerProfileImageUrl;
    this.createdAt = createdAt;
  }
}

export class PublicReviewListResponseDto extends PageResponseDto<PublicReviewListItemDto> {
  @ApiProperty({ type: [PublicReviewListItemDto] })
  data: PublicReviewListItemDto[];
}
