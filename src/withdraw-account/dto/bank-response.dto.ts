import { ApiProperty } from '@nestjs/swagger';

export class BankResponseDto {
  @ApiProperty({ example: '004' })
  code: string;

  @ApiProperty({ example: '국민은행' })
  name: string;

  constructor(code: string, name: string) {
    this.code = code;
    this.name = name;
  }
}
