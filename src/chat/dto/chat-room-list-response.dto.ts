import { ApiProperty } from '@nestjs/swagger';
import { PageResponseDto } from '../../common/dto/page-response.dto';
import { ChatRoomListItemDto } from './chat-room-list-item.dto';

export class ChatRoomListResponseDto extends PageResponseDto<ChatRoomListItemDto> {
  @ApiProperty({ type: [ChatRoomListItemDto] })
  data: ChatRoomListItemDto[];
}
