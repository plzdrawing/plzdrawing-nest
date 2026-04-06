import { PartialType } from '@nestjs/swagger';
import { CreateCoinProductDto } from './create-coin-product.dto';

export class UpdateCoinProductDto extends PartialType(CreateCoinProductDto) {}
