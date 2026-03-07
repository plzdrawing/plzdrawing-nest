import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRoom } from '../entities/chat-room.entity';
import { Message } from '../entities/message.entity';
import { Post } from '../entities/post.entity';
import { PaymentHistory } from '../entities/payment-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, Message, Post, PaymentHistory]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
