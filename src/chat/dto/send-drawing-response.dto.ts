import { ApiProperty } from '@nestjs/swagger';

export class SendDrawingResponseDto {
  @ApiProperty({
    description: '남은 수정 횟수',
    example: 1,
  })
  remainingRevisions: number;
}
