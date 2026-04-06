import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { WithdrawAccountStatus } from '../../common/enums';

export class WithdrawAccountAdminQueryDto {
  @ApiPropertyOptional({ enum: WithdrawAccountStatus })
  @IsOptional()
  @IsEnum(WithdrawAccountStatus)
  status?: WithdrawAccountStatus;

  @ApiPropertyOptional({ description: '회원 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  memberId?: number;

  @ApiPropertyOptional({ description: '은행 코드' })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiPropertyOptional({ description: '계좌 인증 여부' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === true || value === 'true';
  })
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    description: '닉네임, 이메일, 예금주, 마스킹 계좌번호, 은행명 검색',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
