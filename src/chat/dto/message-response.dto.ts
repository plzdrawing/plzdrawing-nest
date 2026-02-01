import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../../common/enums';

export class MessageResponseDto {
  @ApiProperty({ description: '메시지 ID', example: 100 })
  id: number;

  @ApiProperty({ description: '채팅방 ID', example: 1 })
  chatRoomId: number;

  @ApiProperty({ description: '발신자 ID', example: 5 })
  senderId: number;

  @ApiProperty({ enum: MessageType, example: MessageType.TEXT })
  type: MessageType;

  @ApiPropertyOptional({ description: '메시지 내용', example: '안녕하세요' })
  content?: string;

  @ApiPropertyOptional({
    description: '이미지 URL',
    example: 'https://example.com/image.png',
  })
  imageUrl?: string;

  @ApiProperty({ description: '읽음 여부', example: false })
  isRead: boolean;

  @ApiProperty({
    description: '전송 시간',
    example: '2025-01-01T00:00:00.000Z',
  })
  sentAt: Date;
}
