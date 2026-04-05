import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MemberModule } from './member/member.module';
import { AuthModule } from './auth/auth.module';
import { PostModule } from './post/post.module';
import { EmailModule } from './email/email.module';
import { AlarmModule } from './alarm/alarm.module';
import { TagModule } from './tag/tag.module';
import { LikeModule } from './like/like.module';
import { ReviewModule } from './review/review.module';
import { ChatModule } from './chat/chat.module';
import { SettingsModule } from './settings/settings.module';
import { NoticeModule } from './notice/notice.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { WalletModule } from './wallet/wallet.module';
import { WithdrawAccountModule } from './withdraw-account/withdraw-account.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE'),
        logging: true,
      }),
    }),
    MemberModule,
    AuthModule,
    PostModule,
    EmailModule,
    AlarmModule,
    TagModule,
    LikeModule,
    ReviewModule,
    ChatModule,
    SettingsModule,
    NoticeModule,
    InquiryModule,
    WalletModule,
    WithdrawAccountModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
