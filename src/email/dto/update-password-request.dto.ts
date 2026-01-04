import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordRequest {
  @ApiProperty({ description: '현재 비밀번호', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  nowPassword: string;

  @ApiProperty({ description: '새 비밀번호', example: 'newpassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
