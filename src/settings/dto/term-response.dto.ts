import { ApiProperty } from '@nestjs/swagger';

export class TermResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '이용약관' })
  title: string;

  @ApiProperty({ example: 'v1.0.0' })
  version: string;

  @ApiProperty({ example: '약관 본문' })
  content: string;

  @ApiProperty({ example: '2026-04-02 10:00:00' })
  createdAt: Date;

  constructor(
    id: number,
    title: string,
    version: string,
    content: string,
    createdAt: Date,
  ) {
    this.id = id;
    this.title = title;
    this.version = version;
    this.content = content;
    this.createdAt = createdAt;
  }
}
