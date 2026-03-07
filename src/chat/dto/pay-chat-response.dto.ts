import { ApiProperty } from '@nestjs/swagger';

export class PayChatResponseDto {
  @ApiProperty({
    description: '총 수정 가능 횟수',
    example: 2,
  })
  feedbackCount: number;
}
