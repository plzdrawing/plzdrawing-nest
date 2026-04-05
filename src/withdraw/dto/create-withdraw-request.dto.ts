import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateWithdrawRequestDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  coinAmount: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  withdrawAccountId?: number;
}
