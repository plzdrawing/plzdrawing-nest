import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { AuthTokenBlacklistService } from '../auth/auth-token-blacklist.service';
import {
  ChatRoomStatus,
  MemberRole,
  MemberStatus,
  MessageType,
} from '../common/enums';
import { Member } from '../entities/member.entity';
import { MemberService } from '../member/member.service';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';
import { CHAT_WS_ERROR_CODES, CHAT_WS_EVENTS } from './chat.constants';

describe('ChatGateway integration', () => {
  let app: INestApplication;
  let serverUrl: string;
  let jwtService: { verify: jest.Mock };
  let authTokenBlacklistService: { isBlacklisted: jest.Mock };
  let memberService: { findById: jest.Mock };
  let chatService: {
    getChatRoomDetail: jest.Mock;
    sendMessage: jest.Mock;
    markAsRead: jest.Mock;
  };
  let chatRealtimeService: ChatRealtimeService;
  let sockets: ClientSocket[];

  const member = {
    id: 1,
    email: 'member@test.com',
    nickname: 'member',
    status: MemberStatus.ACTIVE,
    role: MemberRole.ROLE_MEMBER,
    isDeleted: false,
  } as Member;

  beforeEach(async () => {
    jwtService = {
      verify: jest.fn().mockReturnValue({ sub: member.id }),
    };
    authTokenBlacklistService = {
      isBlacklisted: jest.fn().mockResolvedValue(false),
    };
    memberService = {
      findById: jest.fn().mockResolvedValue(member),
    };
    chatService = {
      getChatRoomDetail: jest.fn(),
      sendMessage: jest.fn(),
      markAsRead: jest.fn(),
    };
    sockets = [];

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatGateway,
        ChatRealtimeService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: AuthTokenBlacklistService,
          useValue: authTokenBlacklistService,
        },
        {
          provide: MemberService,
          useValue: memberService,
        },
        {
          provide: ChatService,
          useValue: chatService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    chatRealtimeService = moduleRef.get(ChatRealtimeService);

    await app.listen(0, '127.0.0.1');

    const address = app.getHttpServer().address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${address.port}/chats`;
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await app.close();
  });

  const createSocket = (): ClientSocket => {
    const socket = io(serverUrl, {
      auth: {
        token: 'access-token',
      },
      autoConnect: false,
      forceNew: true,
      reconnection: false,
      timeout: 1000,
      transports: ['websocket'],
    });
    sockets.push(socket);

    return socket;
  };

  const waitForEvent = <T>(
    socket: ClientSocket,
    event: string,
    timeoutMs = 1000,
  ): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${event}`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        socket.off(event, onEvent);
        socket.off('connect_error', onConnectError);
      };
      const onEvent = (payload: T) => {
        cleanup();
        resolve(payload);
      };
      const onConnectError = (error: Error) => {
        cleanup();
        reject(error);
      };

      socket.once(event, onEvent);
      socket.once('connect_error', onConnectError);
    });

  const connectSocket = async (): Promise<ClientSocket> => {
    const socket = createSocket();
    const ready = waitForEvent<{ memberId: number }>(
      socket,
      CHAT_WS_EVENTS.CONNECTION_READY,
    );

    socket.connect();

    await expect(ready).resolves.toEqual({ memberId: member.id });

    return socket;
  };

  const emitWithAck = <T>(
    socket: ClientSocket,
    event: string,
    payload: unknown,
    timeoutMs = 1000,
  ): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${event} ack`));
      }, timeoutMs);

      socket.emit(event, payload, (ack: T) => {
        clearTimeout(timer);
        resolve(ack);
      });
    });

  it('인증된 Socket.IO 클라이언트에 연결 준비 이벤트를 보내야 한다', async () => {
    await connectSocket();

    expect(authTokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(
      'Bearer access-token',
    );
    expect(jwtService.verify).toHaveBeenCalledWith('access-token');
    expect(memberService.findById).toHaveBeenCalledWith(member.id);
  });

  it('채팅방 입장 후 room 이벤트와 메시지/읽음 ack를 처리해야 한다', async () => {
    const socket = await connectSocket();
    const chatRoom = {
      chatRoomId: 10,
      status: ChatRoomStatus.REQUESTED,
    };
    chatService.getChatRoomDetail.mockResolvedValue(chatRoom);

    const joined = waitForEvent(socket, CHAT_WS_EVENTS.CHAT_JOINED);
    const joinAck = await emitWithAck(socket, CHAT_WS_EVENTS.CHAT_JOIN, {
      chatRoomId: '10',
    });

    expect(joinAck).toEqual({
      ok: true,
      event: CHAT_WS_EVENTS.CHAT_JOINED,
      data: {
        chatRoomId: 10,
        chatRoom,
      },
    });
    await expect(joined).resolves.toEqual({
      chatRoomId: 10,
      chatRoom,
    });

    const broadcastMessage = {
      id: 200,
      chatRoomId: 10,
      senderId: member.id,
      type: MessageType.TEXT,
      content: 'room broadcast',
    };
    const created = waitForEvent(socket, CHAT_WS_EVENTS.MESSAGE_CREATED);

    chatRealtimeService.emitToChatRoom(
      10,
      CHAT_WS_EVENTS.MESSAGE_CREATED,
      broadcastMessage,
    );

    await expect(created).resolves.toEqual(broadcastMessage);

    const sentMessage = {
      id: 201,
      chatRoomId: 10,
      senderId: member.id,
      type: MessageType.TEXT,
      content: 'hello',
    };
    chatService.sendMessage.mockResolvedValue(sentMessage);

    const sent = waitForEvent(socket, CHAT_WS_EVENTS.MESSAGE_SENT);
    const sendAck = await emitWithAck(socket, CHAT_WS_EVENTS.MESSAGE_SEND, {
      chatRoomId: 10,
      type: MessageType.TEXT,
      content: 'hello',
    });

    expect(chatService.sendMessage).toHaveBeenCalledWith(member, 10, {
      type: MessageType.TEXT,
      content: 'hello',
    });
    expect(sendAck).toEqual({
      ok: true,
      event: CHAT_WS_EVENTS.MESSAGE_SENT,
      data: sentMessage,
    });
    await expect(sent).resolves.toEqual(sentMessage);

    chatService.markAsRead.mockResolvedValue({ updatedCount: 3 });

    const readData = {
      chatRoomId: 10,
      readerId: member.id,
      lastReadMessageId: 77,
      updatedCount: 3,
    };
    const read = waitForEvent(socket, CHAT_WS_EVENTS.MESSAGE_READ_ACK);
    const readAck = await emitWithAck(socket, CHAT_WS_EVENTS.MESSAGE_READ, {
      chatRoomId: 10,
      lastReadMessageId: 77,
    });

    expect(chatService.markAsRead).toHaveBeenCalledWith(member, 10, {
      lastReadMessageId: 77,
    });
    expect(readAck).toEqual({
      ok: true,
      event: CHAT_WS_EVENTS.MESSAGE_READ_ACK,
      data: readData,
    });
    await expect(read).resolves.toEqual(readData);
  });

  it('잘못된 payload는 표준 에러 이벤트와 ack로 응답해야 한다', async () => {
    const socket = await connectSocket();
    const error = waitForEvent(socket, CHAT_WS_EVENTS.CHAT_ERROR);

    const ack = await emitWithAck(socket, CHAT_WS_EVENTS.CHAT_JOIN, {
      chatRoomId: 'invalid',
    });

    const expectedPayload = {
      ok: false,
      code: CHAT_WS_ERROR_CODES.BAD_REQUEST,
      message: 'chatRoomId must be a positive integer',
    };
    expect(ack).toEqual(expectedPayload);
    await expect(error).resolves.toEqual(expectedPayload);
  });
});
