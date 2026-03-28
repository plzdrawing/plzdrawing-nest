import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../entities/member.entity';
import { Profile } from '../entities/profile.entity';
import { Post } from '../entities/post.entity';
import { Review } from '../entities/review.entity';
import { ReviewKeywordMap } from '../entities/review-keyword-map.entity';
import { ChatRoom } from '../entities/chat-room.entity';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { AwsModule } from '../common/aws/aws.module';
import { TagModule } from '../tag/tag.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      Profile,
      Post,
      Review,
      ReviewKeywordMap,
      ChatRoom,
    ]),
    AwsModule,
    TagModule,
  ],
  providers: [MemberService],
  controllers: [MemberController],
  exports: [MemberService],
})
export class MemberModule {}
