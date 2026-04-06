import { ApiProperty } from '@nestjs/swagger';

export class PublicProfileResponseDto {
  @ApiProperty({ description: '회원 ID', example: 7 })
  memberId: number;

  @ApiProperty({ description: '닉네임', example: '홍길동 님' })
  nickname: string;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://example.com/profㄴile.png',
    nullable: true,
  })
  profileImageUrl: string | null;

  @ApiProperty({
    description: '자기소개',
    example: '안녕하세요. 동물 그림쟁이입니다 :)',
    nullable: true,
  })
  introduce: string | null;

  @ApiProperty({
    description: '활성 해시태그 목록',
    example: ['#귀여운', '#누사', '#동물그림'],
    type: [String],
  })
  hashTags: string[];

  @ApiProperty({ description: '등록한 게시글 수', example: 7 })
  drawingCount: number;

  constructor(
    memberId: number,
    nickname: string,
    profileImageUrl: string | null,
    introduce: string | null,
    hashTags: string[],
    drawingCount: number,
  ) {
    this.memberId = memberId;
    this.nickname = nickname;
    this.profileImageUrl = profileImageUrl;
    this.introduce = introduce;
    this.hashTags = hashTags;
    this.drawingCount = drawingCount;
  }
}
