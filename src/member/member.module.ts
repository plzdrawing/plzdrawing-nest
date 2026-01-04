import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../entities/member.entity';
import { Profile } from '../entities/profile.entity';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { AwsModule } from '../common/aws/aws.module';
import { TagModule } from '../tag/tag.module';

@Module({
  imports: [TypeOrmModule.forFeature([Member, Profile]), AwsModule, TagModule],
  providers: [MemberService],
  controllers: [MemberController],
  exports: [MemberService],
})
export class MemberModule {}
