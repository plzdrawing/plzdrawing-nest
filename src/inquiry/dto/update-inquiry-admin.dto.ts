import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { InquiryStatus } from '../../common/enums';

export class UpdateInquiryAdminDto {
  @ApiProperty({
    enum: InquiryStatus,
    example: InquiryStatus.ANSWERED,
  })
  @IsEnum(InquiryStatus)
  status: InquiryStatus;

  @ApiProperty({
    example: '문의주신 내용 확인 후 조치했습니다.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  answer?: string;
}
