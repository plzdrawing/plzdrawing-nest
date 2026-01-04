import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthCredentialsDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호', example: 'password123' })
  @IsString()
  @MinLength(4)
  password: string;
}
