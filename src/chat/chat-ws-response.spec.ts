import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CHAT_WS_ERROR_CODES, CHAT_WS_EVENTS } from './chat.constants';
import {
  createChatWsErrorPayload,
  createChatWsException,
  createChatWsSuccessPayload,
} from './chat-ws-response';

describe('chat websocket response helpers', () => {
  it('성공 ack payload를 생성해야 한다', () => {
    expect(
      createChatWsSuccessPayload(CHAT_WS_EVENTS.MESSAGE_SENT, {
        id: 1,
      }),
    ).toEqual({
      ok: true,
      event: CHAT_WS_EVENTS.MESSAGE_SENT,
      data: {
        id: 1,
      },
    });
  });

  it('WsException 객체 응답을 표준 에러 payload로 변환해야 한다', () => {
    const error = createChatWsException(
      CHAT_WS_ERROR_CODES.BAD_REQUEST,
      'chatRoomId must be a positive integer',
    );

    expect(createChatWsErrorPayload(error)).toEqual({
      ok: false,
      code: CHAT_WS_ERROR_CODES.BAD_REQUEST,
      message: 'chatRoomId must be a positive integer',
    });
  });

  it('HttpException status를 표준 에러 code로 변환해야 한다', () => {
    expect(
      createChatWsErrorPayload(
        new ForbiddenException('Chat room access denied'),
      ),
    ).toEqual({
      ok: false,
      code: CHAT_WS_ERROR_CODES.FORBIDDEN,
      message: 'Chat room access denied',
    });
  });

  it('validation message 배열을 문자열로 변환해야 한다', () => {
    expect(
      createChatWsErrorPayload(
        new BadRequestException({
          message: ['content must be a string', 'content is too long'],
        }),
      ),
    ).toEqual({
      ok: false,
      code: CHAT_WS_ERROR_CODES.BAD_REQUEST,
      message: 'content must be a string, content is too long',
    });
  });

  it('알 수 없는 예외는 내부 오류 payload로 숨겨야 한다', () => {
    expect(
      createChatWsErrorPayload(new Error('database password leaked')),
    ).toEqual({
      ok: false,
      code: CHAT_WS_ERROR_CODES.INTERNAL_ERROR,
      message: 'Internal server error',
    });
  });

  it('fallback을 지정하면 알 수 없는 Http status에 fallback을 사용해야 한다', () => {
    expect(
      createChatWsErrorPayload(new InternalServerErrorException('boom'), {
        code: CHAT_WS_ERROR_CODES.INTERNAL_ERROR,
        message: '요청 처리에 실패했습니다.',
      }),
    ).toEqual({
      ok: false,
      code: CHAT_WS_ERROR_CODES.INTERNAL_ERROR,
      message: 'boom',
    });
  });
});
