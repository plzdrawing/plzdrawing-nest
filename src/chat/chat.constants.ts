export const CHAT_IMAGE_ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_CHAT_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export const CHAT_IMAGE_UPLOAD_EXPIRES_IN_SECONDS = 5 * 60;
export const CHAT_IMAGE_DOWNLOAD_EXPIRES_IN_SECONDS = 10 * 60;

export const CHAT_WS_NAMESPACE = 'chats';

export const CHAT_WS_ROOM_PREFIX = {
  CHAT: 'chat',
  MEMBER: 'member',
} as const;

export const CHAT_WS_EVENTS = {
  CONNECTION_READY: 'connection:ready',
  CONNECTION_ERROR: 'connection:error',
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_JOINED: 'chat:joined',
  CHAT_LEFT: 'chat:left',
  CHAT_CREATED: 'chat:created',
  CHAT_UPDATED: 'chat:updated',
  CHAT_STATUS_CHANGED: 'chat:statusChanged',
  CHAT_DELETED: 'chat:deleted',
  CHAT_ERROR: 'chat:error',
  MESSAGE_SEND: 'message:send',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_CREATED: 'message:created',
  MESSAGE_READ: 'message:read',
  MESSAGE_READ_ACK: 'message:read:ack',
} as const;

export type ChatWsEventName =
  (typeof CHAT_WS_EVENTS)[keyof typeof CHAT_WS_EVENTS];

export const CHAT_WS_ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ChatWsErrorCode =
  (typeof CHAT_WS_ERROR_CODES)[keyof typeof CHAT_WS_ERROR_CODES];
