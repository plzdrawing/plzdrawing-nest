import { ApiProperty } from '@nestjs/swagger';

export class SettingsSummaryResponseDto {
  @ApiProperty({ example: '홍길동' })
  nickname: string;

  @ApiProperty({
    example: 'https://example.com/profile.png',
    nullable: true,
  })
  profileImageUrl: string | null;

  @ApiProperty({ example: ['귀여운', '낚시'] })
  hashTags: string[];

  @ApiProperty({
    example: null,
    nullable: true,
    description: '코인 기능 도입 전까지는 null을 반환합니다.',
  })
  coinBalance: number | null;

  @ApiProperty({ example: false })
  hasWithdrawAccount: boolean;

  @ApiProperty({ example: true })
  notificationEnabled: boolean;

  constructor(
    nickname: string,
    profileImageUrl: string | null,
    hashTags: string[],
    coinBalance: number | null,
    hasWithdrawAccount: boolean,
    notificationEnabled: boolean,
  ) {
    this.nickname = nickname;
    this.profileImageUrl = profileImageUrl;
    this.hashTags = hashTags;
    this.coinBalance = coinBalance;
    this.hasWithdrawAccount = hasWithdrawAccount;
    this.notificationEnabled = notificationEnabled;
  }
}
