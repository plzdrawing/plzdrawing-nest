import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from '../entities/tag.entity';
import { PostTag } from '../entities/post-tag.entity';
import { MemberTag } from '../entities/member-tag.entity';
import { TagService } from './tag.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, PostTag, MemberTag])],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}
