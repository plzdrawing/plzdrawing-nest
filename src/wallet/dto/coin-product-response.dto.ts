import { ApiProperty } from '@nestjs/swagger';

export class CoinProductResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '그리코인 10개' })
  name: string;

  @ApiProperty({ example: 10 })
  coinAmount: number;

  @ApiProperty({ example: 1200 })
  price: number;

  @ApiProperty({ example: 1 })
  displayOrder: number;

  @ApiProperty({ example: '신규 회원 추천 상품', nullable: true })
  description: string | null;

  constructor(
    id: number,
    name: string,
    coinAmount: number,
    price: number,
    displayOrder: number,
    description: string | null,
  ) {
    this.id = id;
    this.name = name;
    this.coinAmount = coinAmount;
    this.price = price;
    this.displayOrder = displayOrder;
    this.description = description;
  }
}
