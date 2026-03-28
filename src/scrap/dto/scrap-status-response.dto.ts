import { ApiProperty } from '@nestjs/swagger';

export class ScrapStatusResponseDto {
  @ApiProperty({ description: '게시글 ID', example: 1 })
  postId: number;

  @ApiProperty({ description: '찜 상태', example: true })
  scrapped: boolean;
}
