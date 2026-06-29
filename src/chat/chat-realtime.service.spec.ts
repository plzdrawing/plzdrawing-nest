import { Server } from 'socket.io';
import { CHAT_WS_EVENTS } from './chat.constants';
import { ChatRealtimeService } from './chat-realtime.service';

describe('ChatRealtimeService', () => {
  let service: ChatRealtimeService;

  beforeEach(() => {
    service = new ChatRealtimeService();
  });

  it('채팅방 room 이름을 일관된 prefix로 만들어야 한다', () => {
    expect(service.getChatRoomName(10)).toBe('chat:10');
  });

  it('회원 개인 room 이름을 일관된 prefix로 만들어야 한다', () => {
    expect(service.getMemberRoomName(7)).toBe('member:7');
  });

  it('서버가 아직 바인딩되지 않아도 이벤트 발행은 실패하지 않아야 한다', () => {
    expect(() =>
      service.emitToChatRoom(10, CHAT_WS_EVENTS.MESSAGE_CREATED, {
        chatRoomId: 10,
      }),
    ).not.toThrow();
    expect(() =>
      service.emitToMember(7, CHAT_WS_EVENTS.CHAT_UPDATED, {
        chatRoomId: 10,
      }),
    ).not.toThrow();
  });

  it('채팅방 room으로 이벤트를 발행해야 한다', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const server = { to } as unknown as Server;
    const payload = { chatRoomId: 10, content: 'hello' };

    service.bindServer(server);
    service.emitToChatRoom(10, CHAT_WS_EVENTS.MESSAGE_CREATED, payload);

    expect(to).toHaveBeenCalledWith('chat:10');
    expect(emit).toHaveBeenCalledWith(CHAT_WS_EVENTS.MESSAGE_CREATED, payload);
  });

  it('회원 개인 room으로 이벤트를 발행해야 한다', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const server = { to } as unknown as Server;
    const payload = { chatRoomId: 10, status: 'ACCEPTED' };

    service.bindServer(server);
    service.emitToMember(7, CHAT_WS_EVENTS.CHAT_UPDATED, payload);

    expect(to).toHaveBeenCalledWith('member:7');
    expect(emit).toHaveBeenCalledWith(CHAT_WS_EVENTS.CHAT_UPDATED, payload);
  });
});
