import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class SendDrawingDto {
  @ApiProperty({
    description: '그림 이미지 object key 목록 (1~3개)',
    example: ['chat/1/2026/03/uuid1.jpg', 'chat/1/2026/03/uuid2.jpg'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  imageObjectKeys: string[];
}
