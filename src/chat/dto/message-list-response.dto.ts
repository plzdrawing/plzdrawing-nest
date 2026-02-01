import { ApiProperty } from '@nestjs/swagger';
import { MessageResponseDto } from './message-response.dto';

export class MessageListResponseDto {
  @ApiProperty({
    description: '메시지 목록',
    type: [MessageResponseDto],
  })
  data: MessageResponseDto[];
}
