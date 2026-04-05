import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCoinProductDto {
  @ApiProperty({ example: '그리코인 10개' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  coinAmount: number;

  @ApiProperty({ example: 1200 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder: number;

  @ApiPropertyOptional({ example: '신규 회원 추천 상품', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
