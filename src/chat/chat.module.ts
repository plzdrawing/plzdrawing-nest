import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRoom } from '../entities/chat-room.entity';
import { Message } from '../entities/message.entity';
import { Post } from '../entities/post.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { Wallet } from '../entities/wallet.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimeService } from './chat-realtime.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoom,
      Message,
      Post,
      PaymentHistory,
      Wallet,
      WalletTransaction,
    ]),
    AuthModule,
    MemberModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatRealtimeService],
  exports: [ChatRealtimeService],
})
export class ChatModule {}
