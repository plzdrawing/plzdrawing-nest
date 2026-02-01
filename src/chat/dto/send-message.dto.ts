import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: '메시지 내용', example: '안녕하세요 :)' })
  @IsString()
  @MaxLength(2000)
  content: string;
}
