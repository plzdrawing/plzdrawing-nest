import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CancelCoinOrderDto {
  @ApiProperty({
    example: '사용자 요청에 의한 결제 취소',
  })
  @IsString()
  @MaxLength(200)
  cancelReason: string;
}
