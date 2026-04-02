import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const PROFILE_HASHTAG_REGEX = /^[A-Za-z0-9가-힣]+$/;

export class UpsertProfileDto {
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
      return value
        .split(',')
        .map((v) => v.trim().replace(/^#/, ''))
        .filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === 'string' ? v.trim().replace(/^#/, '') : v))
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  @Matches(PROFILE_HASHTAG_REGEX, {
    each: true,
    message:
      'each hashtag must contain only Korean, English letters, and numbers',
  })
  hashTag?: string[];
}
