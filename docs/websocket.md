# 채팅 WebSocket

이 문서는 채팅 실시간 기능의 Socket.IO 계약을 정리한다. REST API는 명령 처리와 조회를 담당하고, WebSocket은 채팅 목록/상세 화면이 즉시 갱신되도록 이벤트를 전달한다.

## 연결

- namespace: `/chats`
- local URL: `http://localhost:3000/chats`
- production URL: API host의 `/chats`
- protocol: Socket.IO
- 인증: JWT access token
- CORS: `CHAT_WS_CORS_ORIGINS`, 없으면 `CORS_ORIGINS`

토큰 전달 방식:

```ts
const socket = io('http://localhost:3000/chats', {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
});
```

또는 handshake header로 전달할 수 있다.

```http
Authorization: Bearer <access-token>
```

연결 성공 시 서버는 해당 소켓을 개인 room에 입장시키고 `connection:ready`를 발행한다.

```json
{
  "memberId": 1
}
```

연결 실패 시 `connection:error`를 발행한 뒤 연결을 종료한다.

```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Unauthorized"
}
```

## Room 규칙

| Room                | 입장 방식         | 용도                         |
| ------------------- | ----------------- | ---------------------------- |
| `member:{memberId}` | 연결 성공 시 자동 | 채팅 목록 갱신, 방 생성/삭제 |
| `chat:{chatRoomId}` | `chat:join` 호출  | 채팅방 상세 메시지/상태 갱신 |

채팅 목록 화면은 개인 room 이벤트만 구독하면 된다. 채팅방 상세 화면은 입장 시 `chat:join`, 이탈 시 `chat:leave`를 호출한다.

## Ack 형식

클라이언트가 Socket.IO ack callback을 넘기면 서버는 성공/실패를 표준 형식으로 응답한다.

성공:

```json
{
  "ok": true,
  "event": "message:sent",
  "data": {}
}
```

실패:

```json
{
  "ok": false,
  "code": "BAD_REQUEST",
  "message": "chatRoomId must be a positive integer"
}
```

실패 시 같은 payload가 요청 소켓의 `chat:error` 이벤트로도 발행된다.

## 에러 코드

| Code                | 의미                        |
| ------------------- | --------------------------- |
| `BAD_REQUEST`       | payload 형식 오류           |
| `UNAUTHORIZED`      | 인증 실패 또는 미인증       |
| `FORBIDDEN`         | 채팅방 접근 권한 없음       |
| `NOT_FOUND`         | 대상 채팅방/메시지 없음     |
| `PAYLOAD_TOO_LARGE` | 이미지 등 payload 제한 초과 |
| `INTERNAL_ERROR`    | 처리 중 알 수 없는 오류     |

## 클라이언트 발행 이벤트

### `chat:join`

채팅방 상세 room에 입장한다. 서버는 REST 상세 조회와 같은 권한 검사를 수행한다.

Payload:

```json
{
  "chatRoomId": 1
}
```

Ack event: `chat:joined`

Data:

```json
{
  "chatRoomId": 1,
  "chatRoom": {}
}
```

### `chat:leave`

채팅방 상세 room에서 나간다.

Payload:

```json
{
  "chatRoomId": 1
}
```

Ack event: `chat:left`

Data:

```json
{
  "chatRoomId": 1
}
```

### `message:send`

텍스트 또는 이미지 메시지를 생성한다. 내부적으로 REST 메시지 전송과 같은 서비스 로직을 사용한다.

텍스트 payload:

```json
{
  "chatRoomId": 1,
  "type": "TEXT",
  "content": "안녕하세요"
}
```

이미지 payload:

```json
{
  "chatRoomId": 1,
  "type": "IMAGE",
  "objectKey": "chat/1/image.png",
  "size": 12345,
  "mimeType": "image/png",
  "width": 1024,
  "height": 768
}
```

이미지 메시지는 먼저 `POST /api/chats/:id/messages/image-upload`로 presigned upload URL과 `objectKey`를 받은 뒤, S3 업로드 완료 후 `message:send`를 호출한다.

Ack event: `message:sent`

생성된 메시지는 `chat:{chatRoomId}` room의 `message:created`로도 발행된다.

### `message:read`

상대방이 보낸 미읽음 메시지를 읽음 처리한다.

Payload:

```json
{
  "chatRoomId": 1,
  "lastReadMessageId": 10
}
```

`lastReadMessageId`를 생략하면 현재 읽음 처리 대상 전체를 기준으로 처리한다.

Ack event: `message:read:ack`

Data:

```json
{
  "chatRoomId": 1,
  "readerId": 1,
  "lastReadMessageId": 10,
  "updatedCount": 3
}
```

## 서버 발행 이벤트

| Event                | 대상 room                                   | 주요 payload                                                | 발생 시점                                 |
| -------------------- | ------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| `connection:ready`   | 연결 소켓                                   | `{ memberId }`                                              | WebSocket 인증 성공                       |
| `connection:error`   | 연결 소켓                                   | `{ ok: false, code, message }`                              | WebSocket 인증 실패                       |
| `chat:created`       | `member:{requesterId}`, `member:{artistId}` | `{ chatRoomId, chatRoom }`                                  | 채팅방 생성                               |
| `chat:updated`       | `member:{requesterId}`, `member:{artistId}` | `{ chatRoomId, ... }`                                       | 목록 갱신이 필요한 메시지/읽음/상태 변경  |
| `chat:statusChanged` | `chat:{chatRoomId}`                         | `{ chatRoomId, previousStatus, status, chatRoom?, ... }`    | 수락, 거절, 결제, 작업 시작, 최종 확인 등 |
| `chat:deleted`       | `chat:{chatRoomId}`, 참여자 개인 room       | `{ chatRoomId, deletedByMemberId }`                         | 채팅방 삭제                               |
| `chat:error`         | 요청 소켓                                   | `{ ok: false, code, message }`                              | WebSocket 이벤트 처리 실패                |
| `message:created`    | `chat:{chatRoomId}`                         | `MessageResponseDto`                                        | REST 또는 WebSocket으로 메시지 생성       |
| `message:read`       | `chat:{chatRoomId}`                         | `{ chatRoomId, readerId, lastReadMessageId, updatedCount }` | 읽음 처리                                 |

## REST와 WebSocket 역할 분리

| 기능                   | REST API | WebSocket             |
| ---------------------- | -------- | --------------------- |
| 채팅방 생성            | 주 처리  | 생성 이벤트 수신      |
| 채팅방 목록/상세 조회  | 주 처리  | 갱신 이벤트 수신      |
| 메시지 조회            | 주 처리  | 새 메시지 수신        |
| 메시지 전송            | 가능     | 가능                  |
| 이미지 업로드 URL 발급 | 주 처리  | 사용 안 함            |
| 의뢰 상태 변경         | 주 처리  | 상태 변경 이벤트 수신 |
| 읽음 처리              | 가능     | 가능                  |

## React Native 클라이언트 메모

RN 앱은 브라우저 CORS의 직접 적용 대상이 아니지만, Socket.IO handshake와 서버 allow-list 정책은 동일하게 통과해야 한다. FE 배포 URL이 없는 개발 단계에서는 아래 값을 우선 사용한다.

- `CORS_ORIGINS=http://localhost:3000,https://plzdrawing.o-r.kr`
- `CHAT_WS_CORS_ORIGINS`는 비워서 HTTP CORS와 동일하게 쓰거나 같은 값으로 둔다.
- 실제 RN 앱은 API base URL만 운영 서버로 향하게 설정한다.
- Expo/metro 개발 서버 URL을 브라우저 테스트에 사용할 경우 해당 origin을 추가한다.

## 수동 테스트

브라우저에서 아래 경로로 테스트 페이지를 열 수 있다.

```text
GET /chat-test
```

`/chat-test`는 개발용 페이지라서 `NODE_ENV=production`에서는 404로 응답한다.

확인할 것:

1. access token으로 `/chats` namespace 연결
2. `connection:ready` 수신
3. `chat:join` 성공 ack 확인
4. `message:send` ack와 `message:created` 수신
5. `message:read` ack와 `message:read` 수신
6. 잘못된 payload에서 `chat:error`와 실패 ack 확인

## 테스트 기준

자동화 테스트는 아래 흐름을 우선한다.

- 정상 JWT로 연결하면 `connection:ready`를 받는다.
- 잘못된 토큰 또는 누락 토큰이면 표준 `connection:error` 후 연결 종료된다.
- 참여자는 `chat:join`에 성공하고 비참여자는 실패한다.
- 잘못된 `chatRoomId`는 실패 ack와 `chat:error`를 만든다.
- `message:send`는 같은 room의 다른 소켓에 `message:created`를 보낸다.
- REST로 생성한 메시지도 `message:created`로 전달된다.
- `message:read` 호출 후 room에는 `message:read`, 개인 room에는 필요한 `chat:updated`가 전달된다.
- 상태 변경 REST API 후 `chat:statusChanged`와 `chat:updated`가 발행된다.
