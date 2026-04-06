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

const parseHashTagArray = (value: unknown): unknown => {
  if (value === undefined || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'string' ? item.trim().replace(/^#/, '') : item,
      )
      .filter((item) => item !== '');
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) =>
            typeof item === 'string' ? item.trim().replace(/^#/, '') : item,
          )
          .filter((item) => item !== '');
      }
    } catch {
      // ignore and fallback to comma split
    }
  }

  return trimmed
    .split(',')
    .map((item) => item.trim().replace(/^#/, ''))
    .filter((item) => item !== '');
};

const PROFILE_HASHTAG_REGEX = /^[A-Za-z0-9가-힣]+$/;

export class UpsertProfileDto {
  @ApiPropertyOptional({ description: '자기소개', example: '안녕하세요.' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  introduce?: string;

  @ApiPropertyOptional({
    description: '관심 태그 목록 (최대 5개)',
    example: ['#누사', '#귀여운', '#동물그림'],
  })
  @Transform(({ value }) => parseHashTagArray(value))
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
