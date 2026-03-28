import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scrap } from '../entities/scrap.entity';
import { Post } from '../entities/post.entity';
import { ScrapService } from './scrap.service';
import { ScrapController } from './scrap.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Scrap, Post])],
  controllers: [ScrapController],
  providers: [ScrapService],
  exports: [ScrapService],
})
export class ScrapModule {}
