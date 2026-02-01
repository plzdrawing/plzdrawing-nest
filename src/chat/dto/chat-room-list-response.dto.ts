import { ApiProperty } from '@nestjs/swagger';
import { PageResponseDto } from '../../common/dto/page-response.dto';
import { ChatRoomListItemDto } from './chat-room-list-item.dto';

export class ChatRoomListResponseDto extends PageResponseDto<ChatRoomListItemDto> {
  @ApiProperty({
    description: '채팅방 목록',
    type: [ChatRoomListItemDto],
  })
  data: ChatRoomListItemDto[];
}
