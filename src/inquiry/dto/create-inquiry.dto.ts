import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';
import { InquiryCategory } from '../../common/enums';

export class CreateInquiryDto {
  @ApiProperty({
    enum: InquiryCategory,
    example: InquiryCategory.ACCOUNT,
  })
  @IsEnum(InquiryCategory)
  category: InquiryCategory;

  @ApiProperty({ example: '로그인이 되지 않아요' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: '상세 문의 내용입니다.' })
  @IsString()
  @MaxLength(5000)
  content: string;
}
