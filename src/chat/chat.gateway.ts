import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  Ack,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthTokenBlacklistService } from '../auth/auth-token-blacklist.service';
import { MemberStatus } from '../common/enums';
import { Member } from '../entities/member.entity';
import { MemberService } from '../member/member.service';
import { ChatService } from './chat.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ReadChatDto } from './dto/read-chat.dto';
import {
  CHAT_WS_ERROR_CODES,
  CHAT_WS_EVENTS,
  CHAT_WS_NAMESPACE,
  ChatWsEventName,
} from './chat.constants';
import {
  ChatWsAck,
  createChatWsErrorPayload,
  createChatWsException,
  createChatWsSuccessPayload,
} from './chat-ws-response';

interface JwtPayload {
  sub: number;
}

interface ChatSocketData {
  member?: Member;
}

type AuthenticatedSocket = Socket & {
  data: ChatSocketData;
};

interface ChatRoomSocketPayload {
  chatRoomId?: number | string;
}

interface SendMessageSocketPayload extends SendMessageDto {
  chatRoomId?: number | string;
}

interface ReadChatSocketPayload extends ReadChatDto {
  chatRoomId?: number | string;
}

interface ChatWsEventResponse<T> {
  event: ChatWsEventName;
  data: T;
}

@WebSocketGateway({
  namespace: CHAT_WS_NAMESPACE,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly authTokenBlacklistService: AuthTokenBlacklistService,
    private readonly memberService: MemberService,
    private readonly chatService: ChatService,
    private readonly chatRealtimeService: ChatRealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.chatRealtimeService.bindServer(server);
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const member = await this.authenticate(client);
      client.data.member = member;
      await client.join(this.chatRealtimeService.getMemberRoomName(member.id));
      client.emit(CHAT_WS_EVENTS.CONNECTION_READY, { memberId: member.id });
    } catch (error) {
      this.logger.warn(
        `Rejected websocket connection ${client.id}: ${this.getErrorMessage(error)}`,
      );
      client.emit(
        CHAT_WS_EVENTS.CONNECTION_ERROR,
        createChatWsErrorPayload(undefined, {
          code: CHAT_WS_ERROR_CODES.UNAUTHORIZED,
          message: 'Unauthorized',
        }),
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const memberId = client.data.member?.id;
    if (memberId) {
      this.logger.debug(`Disconnected websocket client ${client.id}`);
    }
  }

  @SubscribeMessage(CHAT_WS_EVENTS.CHAT_JOIN)
  async joinChatRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ChatRoomSocketPayload,
    @Ack() ack?: ChatWsAck,
  ) {
    return this.handleSocketEvent(
      client,
      ack,
      CHAT_WS_EVENTS.CHAT_JOINED,
      async () => {
        const member = this.getAuthenticatedMember(client);
        const chatRoomId = this.parseChatRoomId(payload);
        const chatRoom = await this.chatService.getChatRoomDetail(
          member,
          chatRoomId,
        );

        await client.join(this.chatRealtimeService.getChatRoomName(chatRoomId));

        return {
          chatRoomId,
          chatRoom,
        };
      },
    );
  }

  @SubscribeMessage(CHAT_WS_EVENTS.CHAT_LEAVE)
  async leaveChatRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ChatRoomSocketPayload,
    @Ack() ack?: ChatWsAck,
  ) {
    return this.handleSocketEvent(
      client,
      ack,
      CHAT_WS_EVENTS.CHAT_LEFT,
      async () => {
        this.getAuthenticatedMember(client);
        const chatRoomId = this.parseChatRoomId(payload);

        await client.leave(
          this.chatRealtimeService.getChatRoomName(chatRoomId),
        );

        return {
          chatRoomId,
        };
      },
    );
  }

  @SubscribeMessage(CHAT_WS_EVENTS.MESSAGE_SEND)
  async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessageSocketPayload,
    @Ack() ack?: ChatWsAck,
  ) {
    return this.handleSocketEvent(
      client,
      ack,
      CHAT_WS_EVENTS.MESSAGE_SENT,
      async () => {
        const member = this.getAuthenticatedMember(client);
        const chatRoomId = this.parseChatRoomId(payload);
        const { chatRoomId: _chatRoomId, ...dto } = payload ?? {};

        return this.chatService.sendMessage(member, chatRoomId, dto);
      },
    );
  }

  @SubscribeMessage(CHAT_WS_EVENTS.MESSAGE_READ)
  async markAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ReadChatSocketPayload,
    @Ack() ack?: ChatWsAck,
  ) {
    return this.handleSocketEvent(
      client,
      ack,
      CHAT_WS_EVENTS.MESSAGE_READ_ACK,
      async () => {
        const member = this.getAuthenticatedMember(client);
        const chatRoomId = this.parseChatRoomId(payload);
        const { chatRoomId: _chatRoomId, ...dto } = payload ?? {};
        const result = await this.chatService.markAsRead(
          member,
          chatRoomId,
          dto,
        );

        return {
          chatRoomId,
          readerId: member.id,
          lastReadMessageId: dto.lastReadMessageId ?? null,
          ...result,
        };
      },
    );
  }

  private async authenticate(client: AuthenticatedSocket): Promise<Member> {
    const accessToken = this.extractAccessToken(client);
    const authorization = `Bearer ${accessToken}`;

    if (await this.authTokenBlacklistService.isBlacklisted(authorization)) {
      throw createChatWsException(
        CHAT_WS_ERROR_CODES.UNAUTHORIZED,
        'Authentication token is blacklisted',
      );
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(accessToken);
    } catch {
      throw createChatWsException(
        CHAT_WS_ERROR_CODES.UNAUTHORIZED,
        'Invalid authentication token',
      );
    }

    const memberId = Number(payload.sub);
    if (!memberId) {
      throw createChatWsException(
        CHAT_WS_ERROR_CODES.UNAUTHORIZED,
        'Invalid authentication token',
      );
    }

    const member = await this.memberService.findById(memberId);
    if (!member || member.status !== MemberStatus.ACTIVE || member.isDeleted) {
      throw createChatWsException(
        CHAT_WS_ERROR_CODES.UNAUTHORIZED,
        'Inactive member cannot connect',
      );
    }

    return member;
  }

  private extractAccessToken(client: AuthenticatedSocket): string {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string') {
      return this.stripBearerPrefix(authToken);
    }

    const header = client.handshake.headers.authorization;
    const authorization = Array.isArray(header) ? header[0] : header;
    if (typeof authorization === 'string') {
      return this.stripBearerPrefix(authorization);
    }

    throw createChatWsException(
      CHAT_WS_ERROR_CODES.UNAUTHORIZED,
      'Authentication token is required',
    );
  }

  private stripBearerPrefix(value: string): string {
    const trimmed = value.trim();
    const token = trimmed.startsWith('Bearer ')
      ? trimmed.slice('Bearer '.length).trim()
      : trimmed;

    if (!token) {
      throw createChatWsException(
        CHAT_WS_ERROR_CODES.UNAUTHORIZED,
        'Authentication token is required',
      );
    }

    return token;
  }

  private getAuthenticatedMember(client: AuthenticatedSocket): Member {
    const member = client.data.member;
    if (!member) {
      throw createChatWsException(
        CHAT_WS_ERROR_CODES.UNAUTHORIZED,
        'Authentication required',
      );
    }
    return member;
  }

  private parseChatRoomId(payload: ChatRoomSocketPayload): number {
    const chatRoomId = Number(payload?.chatRoomId);
    if (!Number.isInteger(chatRoomId) || chatRoomId < 1) {
      throw createChatWsException(
        CHAT_WS_ERROR_CODES.BAD_REQUEST,
        'chatRoomId must be a positive integer',
      );
    }
    return chatRoomId;
  }

  private async handleSocketEvent<T>(
    client: AuthenticatedSocket,
    ack: ChatWsAck<T> | undefined,
    event: ChatWsEventName,
    handler: () => Promise<T>,
  ): Promise<ChatWsEventResponse<T> | undefined> {
    try {
      const data = await handler();
      ack?.(createChatWsSuccessPayload(event, data));
      return { event, data };
    } catch (error) {
      const payload = createChatWsErrorPayload(error);
      ack?.(payload);
      client.emit(CHAT_WS_EVENTS.CHAT_ERROR, payload);
      return undefined;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}
