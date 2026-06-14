import { ApiProperty } from '@nestjs/swagger';

export class ReadChatResponseDto {
  @ApiProperty({
    description: '읽음 처리된 메시지 수',
    example: 3,
  })
  updatedCount: number;
}
