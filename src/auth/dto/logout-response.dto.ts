import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    description: '로그아웃 처리 성공 여부',
    example: true,
  })
  success: boolean;

  constructor(success = true) {
    this.success = success;
  }
}
