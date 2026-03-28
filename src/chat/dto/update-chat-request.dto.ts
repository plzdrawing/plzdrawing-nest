import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateChatRequestDto {
  @ApiProperty({
    description: '수정할 요청 내용 (1~200자)',
    example: '강아지 말고 고양이 그림으로 변경해주세요 :)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description: string;
}
