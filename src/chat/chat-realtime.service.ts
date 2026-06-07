import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ChatRealtimeService {
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  getChatRoomName(chatRoomId: number): string {
    return `chat:${chatRoomId}`;
  }

  getMemberRoomName(memberId: number): string {
    return `member:${memberId}`;
  }

  emitToChatRoom(chatRoomId: number, event: string, payload: unknown): void {
    this.server?.to(this.getChatRoomName(chatRoomId)).emit(event, payload);
  }

  emitToMember(memberId: number, event: string, payload: unknown): void {
    this.server?.to(this.getMemberRoomName(memberId)).emit(event, payload);
  }
}
