import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return value;
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  hashTag?: string[];
}
