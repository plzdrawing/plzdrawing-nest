import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ReviewListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '검색어 (작성자 닉네임, 후기 내용, 키워드)',
    example: '친절',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  q?: string;

  @ApiPropertyOptional({
    description: '내가 찜한 게시글의 후기만 조회',
    default: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  scrappedOnly?: boolean;
}
