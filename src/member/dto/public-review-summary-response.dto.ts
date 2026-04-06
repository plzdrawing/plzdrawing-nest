import { ApiProperty } from '@nestjs/swagger';

export class ReviewKeywordCountDto {
  @ApiProperty({ description: '키워드', example: '친절해요' })
  keyword: string;

  @ApiProperty({ description: '키워드 등장 횟수', example: 12 })
  count: number;

  constructor(keyword: string, count: number) {
    this.keyword = keyword;
    this.count = count;
  }
}

export class PublicReviewSummaryResponseDto {
  @ApiProperty({
    description: '평균 별점 (소수점 둘째 자리 반올림)',
    example: 4.5,
  })
  averageStar: number;

  @ApiProperty({ description: '후기 개수', example: 24 })
  reviewCount: number;

  @ApiProperty({
    description: '완료한 작업 수 (COMPLETED/REVIEWED)',
    example: 7,
  })
  completedWorkCount: number;

  @ApiProperty({
    description: '상위 후기 키워드(최대 5개, count 내림차순)',
    type: [ReviewKeywordCountDto],
  })
  topKeywords: ReviewKeywordCountDto[];

  constructor(
    averageStar: number,
    reviewCount: number,
    completedWorkCount: number,
    topKeywords: ReviewKeywordCountDto[],
  ) {
    this.averageStar = averageStar;
    this.reviewCount = reviewCount;
    this.completedWorkCount = completedWorkCount;
    this.topKeywords = topKeywords;
  }
}
