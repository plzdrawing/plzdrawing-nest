import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatUserDto {
  @ApiProperty({ description: '회원 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '닉네임', example: '홍길동' })
  nickname: string;

  @ApiPropertyOptional({
    description: '프로필 이미지 URL',
    example: 'https://example.com/profile.png',
  })
  profileImageUrl?: string;
}
