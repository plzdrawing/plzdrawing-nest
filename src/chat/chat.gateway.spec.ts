import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: { verify: jest.Mock };
  let authTokenBlacklistService: { isBlacklisted: jest.Mock };
  let memberService: { findById: jest.Mock };
  let chatService: {
    getChatRoomDetail: jest.Mock;
    sendMessage: jest.Mock;
    markAsRead: jest.Mock;
  };
  let chatRealtimeService: ChatRealtimeService;

  const member = {
    id: 1,
    email: 'member@test.com',
    nickname: 'member',
    status: MemberStatus.ACTIVE,
    role: MemberRole.ROLE_MEMBER,
    isDeleted: false,
  } as Member;

  const createClient = (options?: {
    token?: string;
    authorization?: string;
    member?: Member;
  }) =>
    ({
      id: 'socket-1',
      handshake: {
        auth: options?.token === undefined ? {} : { token: options.token },
        headers:
          options?.authorization === undefined
            ? {}
            : { authorization: options.authorization },
      },
      data: options?.member ? { member: options.member } : {},
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    }) as any;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    };
    authTokenBlacklistService = {
      isBlacklisted: jest.fn(),
    };
    memberService = {
      findById: jest.fn(),
    };
    chatService = {
      getChatRoomDetail: jest.fn(),
      sendMessage: jest.fn(),
      markAsRead: jest.fn(),
    };
    chatRealtimeService = new ChatRealtimeService();

    gateway = new ChatGateway(
      jwtService as unknown as JwtService,
      authTokenBlacklistService as unknown as AuthTokenBlacklistService,
      memberService as unknown as MemberService,
      chatService as unknown as ChatService,
      chatRealtimeService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('연결 시 JWT를 검증하고 회원 개인 room에 입장시켜야 한다', async () => {
    const client = createClient({ token: 'access-token' });
    authTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
    jwtService.verify.mockReturnValue({ sub: member.id });
    memberService.findById.mockResolvedValue(member);

    await gateway.handleConnection(client);

    expect(authTokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(
      'Bearer access-token',
    );
    expect(jwtService.verify).toHaveBeenCalledWith('access-token');
    expect(client.data.member).toBe(member);
    expect(client.join).toHaveBeenCalledWith('member:1');
    expect(client.emit).toHaveBeenCalledWith(CHAT_WS_EVENTS.CONNECTION_READY, {
      memberId: 1,
    });
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('Authorization 헤더의 Bearer 토큰도 인증에 사용할 수 있어야 한다', async () => {
    const client = createClient({ authorization: 'Bearer header-token' });
    authTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
    jwtService.verify.mockReturnValue({ sub: member.id });
    memberService.findById.mockResolvedValue(member);

    await gateway.handleConnection(client);

    expect(jwtService.verify).toHaveBeenCalledWith('header-token');
    expect(client.join).toHaveBeenCalledWith('member:1');
  });

  it('토큰이 없으면 연결을 거부해야 한다', async () => {
    const client = createClient();

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith(CHAT_WS_EVENTS.CONNECTION_ERROR, {
      ok: false,
      code: CHAT_WS_ERROR_CODES.UNAUTHORIZED,
      message: 'Unauthorized',
    });
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('채팅방 입장 시 접근 권한을 확인하고 채팅방 room에 입장해야 한다', async () => {
    const client = createClient({ member });
    const chatRoom = {
      chatRoomId: 10,
      status: ChatRoomStatus.REQUESTED,
    };
    chatService.getChatRoomDetail.mockResolvedValue(chatRoom);
    const ack = jest.fn();

    const result = await gateway.joinChatRoom(
      client,
      { chatRoomId: '10' },
      ack,
    );

    expect(chatService.getChatRoomDetail).toHaveBeenCalledWith(member, 10);
    expect(client.join).toHaveBeenCalledWith('chat:10');
    expect(result).toEqual({
      event: 'chat:joined',
      data: {
        chatRoomId: 10,
        chatRoom,
      },
    });
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      event: CHAT_WS_EVENTS.CHAT_JOINED,
      data: {
        chatRoomId: 10,
        chatRoom,
      },
    });
  });

  it('채팅방 퇴장 시 채팅방 room에서 나가야 한다', async () => {
    const client = createClient({ member });

    const result = await gateway.leaveChatRoom(client, { chatRoomId: 10 });

    expect(client.leave).toHaveBeenCalledWith('chat:10');
    expect(result).toEqual({
      event: 'chat:left',
      data: {
        chatRoomId: 10,
      },
    });
  });

  it('chatRoomId가 잘못되면 표준 에러 이벤트와 ack를 반환해야 한다', async () => {
    const client = createClient({ member });
    const ack = jest.fn();

    await expect(
      gateway.joinChatRoom(client, { chatRoomId: 'invalid' }, ack),
    ).resolves.toBeUndefined();

    const expectedPayload = {
      ok: false,
      code: CHAT_WS_ERROR_CODES.BAD_REQUEST,
      message: 'chatRoomId must be a positive integer',
    };
    expect(ack).toHaveBeenCalledWith(expectedPayload);
    expect(client.emit).toHaveBeenCalledWith(
      CHAT_WS_EVENTS.CHAT_ERROR,
      expectedPayload,
    );
  });

  it('서비스 예외를 표준 에러 이벤트와 ack로 변환해야 한다', async () => {
    const client = createClient({ member });
    const ack = jest.fn();
    chatService.getChatRoomDetail.mockRejectedValue(
      new ForbiddenException('Chat room access denied'),
    );

    await expect(
      gateway.joinChatRoom(client, { chatRoomId: 10 }, ack),
    ).resolves.toBeUndefined();

    const expectedPayload = {
      ok: false,
      code: CHAT_WS_ERROR_CODES.FORBIDDEN,
      message: 'Chat room access denied',
    };
    expect(ack).toHaveBeenCalledWith(expectedPayload);
    expect(client.emit).toHaveBeenCalledWith(
      CHAT_WS_EVENTS.CHAT_ERROR,
      expectedPayload,
    );
  });

  it('메시지 전송 이벤트를 서비스로 위임하고 ack를 반환해야 한다', async () => {
    const client = createClient({ member });
    const message = {
      id: 100,
      chatRoomId: 10,
      senderId: member.id,
      type: MessageType.TEXT,
      content: 'hello',
    };
    chatService.sendMessage.mockResolvedValue(message);
    const ack = jest.fn();

    const result = await gateway.sendMessage(
      client,
      {
        chatRoomId: '10',
        type: MessageType.TEXT,
        content: 'hello',
      },
      ack,
    );

    expect(chatService.sendMessage).toHaveBeenCalledWith(member, 10, {
      type: MessageType.TEXT,
      content: 'hello',
    });
    expect(result).toEqual({
      event: 'message:sent',
      data: message,
    });
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      event: CHAT_WS_EVENTS.MESSAGE_SENT,
      data: message,
    });
  });

  it('읽음 처리 이벤트를 서비스로 위임하고 ack를 반환해야 한다', async () => {
    const client = createClient({ member });
    chatService.markAsRead.mockResolvedValue({ updatedCount: 3 });
    const ack = jest.fn();

    const result = await gateway.markAsRead(
      client,
      {
        chatRoomId: 10,
        lastReadMessageId: 77,
      },
      ack,
    );

    expect(chatService.markAsRead).toHaveBeenCalledWith(member, 10, {
      lastReadMessageId: 77,
    });
    expect(result).toEqual({
      event: 'message:read:ack',
      data: {
        chatRoomId: 10,
        readerId: member.id,
        lastReadMessageId: 77,
        updatedCount: 3,
      },
    });
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      event: CHAT_WS_EVENTS.MESSAGE_READ_ACK,
      data: {
        chatRoomId: 10,
        readerId: member.id,
        lastReadMessageId: 77,
        updatedCount: 3,
      },
    });
  });
});
