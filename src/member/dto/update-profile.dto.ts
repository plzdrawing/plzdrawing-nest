import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '닉네임', example: '홍길동' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: '자기소개', example: '안녕하세요.' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  introduce?: string;

  @ApiPropertyOptional({
    description: '관심 태그 목록',
    example: ['그림', '일러스트'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  hashTag?: string[];
}
