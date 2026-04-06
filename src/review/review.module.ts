import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '../entities/review.entity';
import { ReviewKeyword } from '../entities/review-keyword.entity';
import { ReviewKeywordMap } from '../entities/review-keyword-map.entity';
import { ChatRoom } from '../entities/chat-room.entity';
import { Message } from '../entities/message.entity';
import { LikeEntity } from '../entities/like-entity.entity';
import { Scrap } from '../entities/scrap.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Review,
      ReviewKeyword,
      ReviewKeywordMap,
      ChatRoom,
      Message,
      LikeEntity,
      Scrap,
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
