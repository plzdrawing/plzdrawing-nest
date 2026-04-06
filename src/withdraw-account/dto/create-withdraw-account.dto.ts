import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateWithdrawAccountDto {
  @ApiProperty({ example: '004' })
  @IsString()
  @MaxLength(10)
  bankCode: string;

  @ApiProperty({ example: '국민은행' })
  @IsString()
  @MaxLength(50)
  bankName: string;

  @ApiProperty({ example: '홍길동' })
  @IsString()
  @MaxLength(50)
  accountHolder: string;

  @ApiProperty({ example: '12345678901234' })
  @IsString()
  @Matches(/^[0-9-]+$/, {
    message: 'accountNumber must contain only numbers and hyphens',
  })
  @MaxLength(30)
  accountNumber: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
