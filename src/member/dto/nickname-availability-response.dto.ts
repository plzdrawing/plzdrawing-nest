import { ApiProperty } from '@nestjs/swagger';

export class NicknameAvailabilityResponseDto {
  @ApiProperty({
    description: '닉네임 사용 가능 여부',
    example: true,
  })
  available: boolean;

  constructor(available: boolean) {
    this.available = available;
  }
}
