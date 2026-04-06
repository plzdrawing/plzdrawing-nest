import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class NoticeAdminQueryDto {
  @ApiPropertyOptional({
    description: '작성자 닉네임, 이메일, 제목, 내용 키워드 검색',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
