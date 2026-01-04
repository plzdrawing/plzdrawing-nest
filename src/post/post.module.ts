import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../entities/post.entity';
import { PostImage } from '../entities/post-image.entity';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { AwsModule } from '../common/aws/aws.module';
import { TagModule } from '../tag/tag.module';
import { LikeModule } from '../like/like.module';
import { ReviewModule } from '../review/review.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostImage]),
    AwsModule,
    TagModule,
    LikeModule,
    ReviewModule,
    MemberModule,
  ],
  providers: [PostService],
  controllers: [PostController],
  exports: [PostService],
})
export class PostModule {}
