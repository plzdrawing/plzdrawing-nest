import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateAppInfoDto {
  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  minimumSupportedVersion?: string;

  @ApiPropertyOptional({ example: 'support@plzdrawing.com' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  supportEmail?: string;

  @ApiPropertyOptional({ example: '평일 10:00 - 18:00' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  supportHours?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/privacy-policy',
    nullable: true,
  })
  @IsOptional()
  @IsUrl({
    require_protocol: true,
    require_tld: true,
  })
  privacyPolicyUrl?: string | null;
}
