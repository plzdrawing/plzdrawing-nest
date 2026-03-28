import { ApiProperty } from '@nestjs/swagger';
import { ReviewListItemDto } from './review-list-item.dto';

export class ReviewPageResponseDto {
  @ApiProperty({ description: '후기 목록', type: [ReviewListItemDto] })
  data: ReviewListItemDto[];

  @ApiProperty({ description: '총 데이터 수', example: 25 })
  total: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지 당 항목 수', example: 10 })
  limit: number;
}
