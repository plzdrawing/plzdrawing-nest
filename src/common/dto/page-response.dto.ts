import { ApiProperty } from '@nestjs/swagger';

export class PageResponseDto<T> {
  @ApiProperty({ description: '데이터 목록', isArray: true })
  data: T[];

  @ApiProperty({ description: '총 데이터 수', example: 100 })
  total: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지 당 항목 수', example: 10 })
  limit: number;
}
