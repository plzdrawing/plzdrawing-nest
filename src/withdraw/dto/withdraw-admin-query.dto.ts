import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { WithdrawRequestStatus } from '../../common/enums';

export class WithdrawAdminQueryDto {
  @ApiPropertyOptional({ enum: WithdrawRequestStatus })
  @IsOptional()
  @IsEnum(WithdrawRequestStatus)
  status?: WithdrawRequestStatus;

  @ApiPropertyOptional({ description: '회원 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  memberId?: number;

  @ApiPropertyOptional({ description: '은행 코드' })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiPropertyOptional({
    description: '닉네임, 이메일, 예금주, 마스킹 계좌번호, 은행명 검색',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
