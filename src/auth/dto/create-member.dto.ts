import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const MEMBER_NICKNAME_REGEX = /^[A-Za-z0-9가-힣]+$/;

export class CreateMemberDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호', example: 'password123' })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({ description: '닉네임', example: '홍길동' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(20)
  @Matches(MEMBER_NICKNAME_REGEX, {
    message: 'nickname must contain only Korean, English letters, and numbers',
  })
  nickname: string;
}
