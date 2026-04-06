import { ApiProperty } from '@nestjs/swagger';

export class NoticeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '서비스 점검 안내' })
  title: string;

  @ApiProperty({ example: '점검이 예정되어 있습니다.' })
  content: string;

  @ApiProperty({ example: 10, nullable: true })
  adminId: number | null;

  @ApiProperty({ example: '관리자', nullable: true })
  adminNickname: string | null;

  @ApiProperty({ example: 'admin@example.com', nullable: true })
  adminEmail: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/admin.png',
    nullable: true,
  })
  adminProfileUrl: string | null;

  @ApiProperty({ example: '2026-04-02 10:00:00' })
  createdAt: Date;

  constructor(
    id: number,
    title: string,
    content: string,
    adminId: number | null,
    adminNickname: string | null,
    adminEmail: string | null,
    adminProfileUrl: string | null,
    createdAt: Date,
  ) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.adminId = adminId;
    this.adminNickname = adminNickname;
    this.adminEmail = adminEmail;
    this.adminProfileUrl = adminProfileUrl;
    this.createdAt = createdAt;
  }
}
