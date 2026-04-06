import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateTermDto {
  @ApiProperty({ example: '서비스 이용약관' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @MaxLength(50)
  version: string;

  @ApiProperty({
    example: '플리즈드로잉 서비스 이용약관입니다.',
  })
  @IsString()
  content: string;
}
