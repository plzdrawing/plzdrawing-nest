import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWithdrawAccountAdminDto {
  @ApiPropertyOptional({
    example: '예금주 및 계좌번호 확인 완료',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
