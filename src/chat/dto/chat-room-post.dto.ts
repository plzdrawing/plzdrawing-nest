import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRoomPostDto {
  @ApiProperty({ description: '게시글 ID', example: 10 })
  id: number;

  @ApiProperty({ description: '게시글 제목', example: '귀여운 그림' })
  title: string;

  @ApiPropertyOptional({
    description: '게시글 썸네일 URL',
    example: 'https://example.com/thumb.png',
  })
  thumbnailUrl?: string;
}
