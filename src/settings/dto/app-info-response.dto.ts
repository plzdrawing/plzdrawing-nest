import { ApiProperty } from '@nestjs/swagger';

export class AppInfoResponseDto {
  @ApiProperty({ example: '0.0.1' })
  appVersion: string;

  @ApiProperty({ example: '0.0.1' })
  minimumSupportedVersion: string;

  @ApiProperty({ example: 'support@plzdrawing.com' })
  supportEmail: string;

  @ApiProperty({ example: '평일 10:00 - 18:00' })
  supportHours: string;

  @ApiProperty({
    example: 'https://example.com/privacy-policy',
    nullable: true,
  })
  privacyPolicyUrl: string | null;

  constructor(
    appVersion: string,
    minimumSupportedVersion: string,
    supportEmail: string,
    supportHours: string,
    privacyPolicyUrl: string | null,
  ) {
    this.appVersion = appVersion;
    this.minimumSupportedVersion = minimumSupportedVersion;
    this.supportEmail = supportEmail;
    this.supportHours = supportHours;
    this.privacyPolicyUrl = privacyPolicyUrl;
  }
}
