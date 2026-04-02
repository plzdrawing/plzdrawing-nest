import { ApiProperty } from '@nestjs/swagger';

export class NoticeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '서비스 점검 안내' })
  title: string;

  @ApiProperty({ example: '점검이 예정되어 있습니다.' })
  content: string;

  @ApiProperty({ example: '2026-04-02 10:00:00' })
  createdAt: Date;

  constructor(id: number, title: string, content: string, createdAt: Date) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.createdAt = createdAt;
  }
}
