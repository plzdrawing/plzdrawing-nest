import { ApiProperty } from '@nestjs/swagger';
import { ChatRoomDetailResponseDto } from './chat-room-detail-response.dto';

export class ChatRoomCreateResponseDto {
  @ApiProperty({ description: '기존 채팅방 여부', example: false })
  isExisting: boolean;

  @ApiProperty({ type: ChatRoomDetailResponseDto })
  chatRoom: ChatRoomDetailResponseDto;
}
