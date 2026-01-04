import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { MemberModule } from '../member/member.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [ConfigModule, MemberModule, RedisModule],
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}
