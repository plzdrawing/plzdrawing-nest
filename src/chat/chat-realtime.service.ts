import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { CHAT_WS_ROOM_PREFIX, ChatWsEventName } from './chat.constants';

@Injectable()
export class ChatRealtimeService {
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  getChatRoomName(chatRoomId: number): string {
    return `${CHAT_WS_ROOM_PREFIX.CHAT}:${chatRoomId}`;
  }

  getMemberRoomName(memberId: number): string {
    return `${CHAT_WS_ROOM_PREFIX.MEMBER}:${memberId}`;
  }

  emitToChatRoom(
    chatRoomId: number,
    event: ChatWsEventName,
    payload: unknown,
  ): void {
    this.server?.to(this.getChatRoomName(chatRoomId)).emit(event, payload);
  }

  emitToMember(
    memberId: number,
    event: ChatWsEventName,
    payload: unknown,
  ): void {
    this.server?.to(this.getMemberRoomName(memberId)).emit(event, payload);
  }
}
