import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatRoomStatus } from '../../common/enums';
import { ChatUserDto } from './chat-user.dto';
import { LastMessageDto } from './last-message.dto';

export class ChatRoomListItemDto {
  @ApiProperty({ description: '채팅방 ID', example: 1 })
  chatRoomId: number;

  @ApiProperty({ description: '게시글 ID', example: 10 })
  postId: number;

  @ApiProperty({ description: '게시글 제목', example: '귀여운 그림' })
  title: string;

  @ApiPropertyOptional({
    description: '게시글 썸네일 URL',
    example: 'https://example.com/thumb.png',
  })
  thumbnailUrl?: string;

  @ApiProperty({ enum: ChatRoomStatus, example: ChatRoomStatus.REQUESTED })
  status: ChatRoomStatus;

  @ApiProperty({ type: ChatUserDto })
  counterpart: ChatUserDto;

  @ApiPropertyOptional({ type: LastMessageDto })
  lastMessage?: LastMessageDto;

  @ApiProperty({ description: '미읽음 메시지 수', example: 2 })
  unreadCount: number;

  @ApiPropertyOptional({ description: '요청 금액', example: 5000 })
  price?: number;

  @ApiPropertyOptional({ description: '결제 금액', example: 5000 })
  paidAmount?: number;

  @ApiProperty({
    description: '최근 업데이트 시간',
    example: '2025-01-01 12:00:00',
  })
  updatedAt: Date;
}
