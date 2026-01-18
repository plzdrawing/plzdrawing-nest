import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ChatRoomStatus } from '../../common/enums';

export class UpdateChatRoomStatusDto {
  @ApiProperty({ enum: ChatRoomStatus, example: ChatRoomStatus.IN_PROGRESS })
  @IsEnum(ChatRoomStatus)
  status: ChatRoomStatus;
}
