import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PostCategory } from '../../common/enums';
import { POST_HASH_TAG_REGEX } from './post-hash-tag.constant';

const parseStringArray = (value: unknown): unknown => {
  if (value === undefined || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : item))
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
          .map((item) => (typeof item === 'string' ? item.trim() : item))
          .filter((item) => item !== '');
      }
    } catch {
      // ignore and fallback to comma-splitting
    }
  }

  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
};

const parseNumberArray = (value: unknown): unknown => {
  const parsed = parseStringArray(value);

  if (!Array.isArray(parsed)) {
    return parsed;
  }

  return parsed.map((item) => Number(item));
};

export class UpdatePostDto {
  @ApiPropertyOptional({
    description: '게시글 제목(최대 20자)',
    example: '소소한 그림 수정본',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  title?: string;

  @ApiPropertyOptional({
    description: '게시글 설명(최대 30자)',
    example: '수정 요청 반영해서 다시 올려요.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  content?: string;

  @ApiPropertyOptional({
    description: '게시글 태그 목록(최대 5개, #문자열, 공백 없음)',
    example: ['#귀여운', '#누사'],
    type: [String],
  })
  @Transform(({ value }) => parseStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @Matches(POST_HASH_TAG_REGEX, {
    each: true,
    message:
      '각 해시태그는 #으로 시작하고 한글/영문/숫자 10자 이하여야 합니다.',
  })
  hashTag?: string[];

  @ApiPropertyOptional({
    description: '삭제할 이미지 ID 목록',
    example: [12, 13],
    type: [Number],
  })
  @Transform(({ value }) => parseNumberArray(value))
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  deleteImageIds?: number[];

  @ApiPropertyOptional({
    description: '게시글 카테고리',
    enum: PostCategory,
    example: PostCategory.REQUEST,
  })
  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;
}
