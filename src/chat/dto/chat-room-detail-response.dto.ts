import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatRoomStatus } from '../../common/enums';
import { ChatUserDto } from './chat-user.dto';
import { ChatRoomPostDto } from './chat-room-post.dto';

export class ChatRoomDetailResponseDto {
  @ApiProperty({ description: '채팅방 ID', example: 1 })
  chatRoomId: number;

  @ApiProperty({ enum: ChatRoomStatus, example: ChatRoomStatus.REQUESTED })
  status: ChatRoomStatus;

  @ApiProperty({ type: ChatRoomPostDto })
  post: ChatRoomPostDto;

  @ApiProperty({ type: ChatUserDto })
  requester: ChatUserDto;

  @ApiProperty({ type: ChatUserDto })
  artist: ChatUserDto;

  @ApiPropertyOptional({
    description: '요청 설명',
    example: '강아지 그림 요청',
  })
  description?: string;

  @ApiPropertyOptional({
    description: '참고 이미지 object key 목록',
    type: [String],
    example: ['chat/request/1/2026/03/uuid1.png'],
  })
  referenceImageObjectKeys?: string[];

  @ApiPropertyOptional({ description: '요청 금액', example: 5000 })
  price?: number;

  @ApiPropertyOptional({ description: '결제 금액', example: 5000 })
  paidAmount?: number;

  @ApiProperty({ description: '생성 시간', example: '2025-01-01 12:00:00' })
  createdAt: Date;

  @ApiProperty({ description: '업데이트 시간', example: '2025-01-01 12:00:00' })
  updatedAt: Date;
}
