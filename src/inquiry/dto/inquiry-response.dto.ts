import { ApiProperty } from '@nestjs/swagger';
import { InquiryCategory, InquiryStatus } from '../../common/enums';

export class InquiryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    enum: InquiryCategory,
    example: InquiryCategory.ACCOUNT,
  })
  category: InquiryCategory;

  @ApiProperty({ example: '로그인이 되지 않아요' })
  title: string;

  @ApiProperty({ example: '상세 문의 내용입니다.' })
  content: string;

  @ApiProperty({
    enum: InquiryStatus,
    example: InquiryStatus.PENDING,
  })
  status: InquiryStatus;

  @ApiProperty({
    example: null,
    nullable: true,
  })
  answer: string | null;

  @ApiProperty({ example: 10, nullable: true })
  memberId: number | null;

  @ApiProperty({ example: '그림좋아', nullable: true })
  memberNickname: string | null;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  memberEmail: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/profile.png',
    nullable: true,
  })
  memberProfileUrl: string | null;

  @ApiProperty({ example: '2026-04-02T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    example: null,
    nullable: true,
  })
  answeredAt: Date | null;

  @ApiProperty({
    example: ['https://example.com/inquiry/image-1.png'],
  })
  imageUrls: string[];

  constructor(
    id: number,
    category: InquiryCategory,
    title: string,
    content: string,
    status: InquiryStatus,
    answer: string | null,
    memberId: number | null,
    memberNickname: string | null,
    memberEmail: string | null,
    memberProfileUrl: string | null,
    createdAt: Date,
    answeredAt: Date | null,
    imageUrls: string[],
  ) {
    this.id = id;
    this.category = category;
    this.title = title;
    this.content = content;
    this.status = status;
    this.answer = answer;
    this.memberId = memberId;
    this.memberNickname = memberNickname;
    this.memberEmail = memberEmail;
    this.memberProfileUrl = memberProfileUrl;
    this.createdAt = createdAt;
    this.answeredAt = answeredAt;
    this.imageUrls = imageUrls;
  }
}
