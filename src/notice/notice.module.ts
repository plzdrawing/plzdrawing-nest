import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../entities/member.entity';
import { Notice } from '../entities/notice.entity';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notice, Member])],
  controllers: [NoticeController],
  providers: [NoticeService],
})
export class NoticeModule {}
