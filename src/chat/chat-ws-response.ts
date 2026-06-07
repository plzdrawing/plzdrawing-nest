import { HttpException, HttpStatus } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import {
  CHAT_WS_ERROR_CODES,
  ChatWsErrorCode,
  ChatWsEventName,
} from './chat.constants';

export interface ChatWsSuccessPayload<T> {
  ok: true;
  event: ChatWsEventName;
  data: T;
}

export interface ChatWsErrorPayload {
  ok: false;
  code: ChatWsErrorCode;
  message: string;
}

export type ChatWsAckPayload<T> = ChatWsSuccessPayload<T> | ChatWsErrorPayload;

export type ChatWsAck<T = unknown> = (payload: ChatWsAckPayload<T>) => void;

const HTTP_STATUS_ERROR_CODE_MAP: Partial<Record<HttpStatus, ChatWsErrorCode>> =
  {
    [HttpStatus.BAD_REQUEST]: CHAT_WS_ERROR_CODES.BAD_REQUEST,
    [HttpStatus.UNAUTHORIZED]: CHAT_WS_ERROR_CODES.UNAUTHORIZED,
    [HttpStatus.FORBIDDEN]: CHAT_WS_ERROR_CODES.FORBIDDEN,
    [HttpStatus.NOT_FOUND]: CHAT_WS_ERROR_CODES.NOT_FOUND,
    [HttpStatus.PAYLOAD_TOO_LARGE]: CHAT_WS_ERROR_CODES.PAYLOAD_TOO_LARGE,
  };

export function createChatWsSuccessPayload<T>(
  event: ChatWsEventName,
  data: T,
): ChatWsSuccessPayload<T> {
  return {
    ok: true,
    event,
    data,
  };
}

export function createChatWsErrorPayload(
  error: unknown,
  fallback: Pick<ChatWsErrorPayload, 'code' | 'message'> = {
    code: CHAT_WS_ERROR_CODES.INTERNAL_ERROR,
    message: 'Internal server error',
  },
): ChatWsErrorPayload {
  if (error instanceof WsException) {
    return createErrorPayloadFromResponse(error.getError(), fallback);
  }

  if (error instanceof HttpException) {
    const status = error.getStatus();
    const code = HTTP_STATUS_ERROR_CODE_MAP[status] ?? fallback.code;
    return createErrorPayloadFromResponse(error.getResponse(), {
      code,
      message: fallback.message,
    });
  }

  return {
    ok: false,
    ...fallback,
  };
}

export function createChatWsException(
  code: ChatWsErrorCode,
  message: string,
): WsException {
  return new WsException({ code, message });
}

function createErrorPayloadFromResponse(
  response: string | object,
  fallback: Pick<ChatWsErrorPayload, 'code' | 'message'>,
): ChatWsErrorPayload {
  if (typeof response === 'string') {
    return {
      ok: false,
      code: fallback.code,
      message: response,
    };
  }

  const code = getErrorCode(response) ?? fallback.code;
  const message = getErrorMessage(response) ?? fallback.message;

  return {
    ok: false,
    code,
    message,
  };
}

function getErrorCode(response: object): ChatWsErrorCode | undefined {
  if (!isRecord(response)) return undefined;
  const code = response.code;
  if (
    typeof code === 'string' &&
    Object.values(CHAT_WS_ERROR_CODES).includes(code as ChatWsErrorCode)
  ) {
    return code as ChatWsErrorCode;
  }
  return undefined;
}

function getErrorMessage(response: object): string | undefined {
  if (!isRecord(response)) return undefined;

  const message = response.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }
  return undefined;
}

function isRecord(value: object): value is Record<string, unknown> {
  return value !== null && !Array.isArray(value);
}
