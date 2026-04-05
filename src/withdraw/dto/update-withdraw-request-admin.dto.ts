import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WithdrawRequestStatus } from '../../common/enums';

export class UpdateWithdrawRequestAdminDto {
  @ApiProperty({
    enum: WithdrawRequestStatus,
    example: WithdrawRequestStatus.APPROVED,
  })
  @IsEnum(WithdrawRequestStatus)
  status: WithdrawRequestStatus;

  @ApiPropertyOptional({ example: '예금주 불일치로 반려' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
