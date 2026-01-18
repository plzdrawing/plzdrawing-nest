import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../../common/enums';

export class LastMessageDto {
  @ApiProperty({ description: '메시지 ID', example: 100 })
  id: number;

  @ApiProperty({ enum: MessageType, example: MessageType.TEXT })
  type: MessageType;

  @ApiPropertyOptional({ description: '메시지 내용', example: '안녕하세요' })
  content?: string;

  @ApiPropertyOptional({
    description: '이미지 URL',
    example: 'https://example.com/image.png',
  })
  imageUrl?: string;

  @ApiProperty({
    description: '전송 시간',
    example: '2025-01-01T00:00:00.000Z',
  })
  sentAt: Date;
}
