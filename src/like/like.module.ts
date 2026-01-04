import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikeEntity } from '../entities/like-entity.entity';
import { LikeService } from './like.service';

@Module({
  imports: [TypeOrmModule.forFeature([LikeEntity])],
  providers: [LikeService],
  exports: [LikeService],
})
export class LikeModule {}
