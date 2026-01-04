import { ApiProperty } from '@nestjs/swagger';

export class ProfileInfoResponse {
  @ApiProperty({ description: '닉네임', example: '홍길동' })
  nickname: string;

  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  email: string;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://example.com/image.jpg',
  })
  profileImageUrl: string;

  @ApiProperty({ description: '자기소개', example: '안녕하세요.' })
  introduce: string;

  @ApiProperty({ description: '관심 태그 목록', example: ['그림', '일러스트'] })
  hashTags: string[];

  constructor(
    nickname: string,
    email: string,
    profileImageUrl: string,
    introduce: string,
    hashTags: string[],
  ) {
    this.nickname = nickname;
    this.email = email;
    this.profileImageUrl = profileImageUrl;
    this.introduce = introduce;
    this.hashTags = hashTags;
  }
}
