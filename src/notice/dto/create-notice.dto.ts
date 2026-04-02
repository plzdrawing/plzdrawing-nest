import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateNoticeDto {
  @ApiProperty({ example: '서비스 점검 안내' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: '점검이 예정되어 있습니다.' })
  @IsString()
  @MaxLength(5000)
  content: string;
}
