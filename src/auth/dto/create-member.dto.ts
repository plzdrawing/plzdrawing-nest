import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호', example: 'password123' })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({ description: '닉네임', example: '홍길동' })
  @IsString()
  nickname: string;
}
