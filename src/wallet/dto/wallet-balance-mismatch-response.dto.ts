import { ApiProperty } from '@nestjs/swagger';
import { PageResponseDto } from '../../common/dto/page-response.dto';

export class WalletBalanceMismatchResponseDto {
  @ApiProperty({ example: 15 })
  memberId: number;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  memberEmail: string | null;

  @ApiProperty({ example: '그림좋아', nullable: true })
  memberNickname: string | null;

  @ApiProperty({ example: 100 })
  walletBalance: number;

  @ApiProperty({
    example: 90,
    description: '완료된 지갑 거래내역 coinAmount 합계',
  })
  transactionBalance: number;

  @ApiProperty({
    example: 10,
    description: 'walletBalance - transactionBalance',
  })
  difference: number;

  constructor(
    memberId: number,
    memberEmail: string | null,
    memberNickname: string | null,
    walletBalance: number,
    transactionBalance: number,
    difference: number,
  ) {
    this.memberId = memberId;
    this.memberEmail = memberEmail;
    this.memberNickname = memberNickname;
    this.walletBalance = walletBalance;
    this.transactionBalance = transactionBalance;
    this.difference = difference;
  }
}

export class WalletBalanceMismatchPageResponseDto extends PageResponseDto<WalletBalanceMismatchResponseDto> {
  @ApiProperty({ type: [WalletBalanceMismatchResponseDto] })
  data: WalletBalanceMismatchResponseDto[];
}
