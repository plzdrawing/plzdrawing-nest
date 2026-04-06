import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoinProduct } from '../entities/coin-product.entity';
import { Member } from '../entities/member.entity';
import { Terms } from '../entities/terms.entity';
import { AppInitService } from './app-init.service';

@Module({
  imports: [TypeOrmModule.forFeature([CoinProduct, Terms, Member])],
  providers: [AppInitService],
})
export class AppInitModule {}
