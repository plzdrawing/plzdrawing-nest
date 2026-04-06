import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InquiryCategory, InquiryStatus } from '../../common/enums';

export class InquiryAdminQueryDto {
  @ApiPropertyOptional({ enum: InquiryStatus })
  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;

  @ApiPropertyOptional({ enum: InquiryCategory })
  @IsOptional()
  @IsEnum(InquiryCategory)
  category?: InquiryCategory;

  @ApiPropertyOptional({
    description: '닉네임, 이메일, 제목, 내용 키워드 검색',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
