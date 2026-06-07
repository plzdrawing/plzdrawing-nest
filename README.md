# PlzDrawing Backend

NestJS 기반 `plzdrawing` 백엔드입니다.  
현재 저장소에는 아래 기능이 포함되어 있습니다.

- 회원/프로필 수정 및 닉네임 검증
- 일반 로그인, 소셜 로그인, 로그아웃
- 설정 홈, 알림 설정, 앱 정보, 약관 조회/관리
- 공지사항, 1:1 문의, 관리자 운영 API
- 게시글 기반 채팅/작업 의뢰 플로우 및 WebSocket 실시간 이벤트
- 코인 상품, 코인 주문, 토스 결제 승인/취소/웹훅 처리
- 지갑/거래원장
- 환전계좌 등록/관리/관리자 인증
- 환전 신청/관리자 처리

## 실행

```bash
pnpm install
pnpm start:dev
```

빌드 확인:

```bash
pnpm build
```

DB 마이그레이션 관련:

```bash
pnpm db:migration:show
pnpm db:migration:generate InitSchema
pnpm db:migration:run
pnpm db:migration:revert
```

테스트 실행:

```bash
pnpm test
```

특정 스펙만 실행할 때:

```bash
./node_modules/.bin/jest --runInBand --watchman=false src/path/to/file.spec.ts
```

## 환경변수

실제 실행 전에는 `.env.example`을 참고해서 `.env`를 구성하면 됩니다.

### 기본 서버

- `PORT`
- `NODE_ENV`
- `SWAGGER_ENABLED`
- `CORS_ORIGINS`: HTTP CORS 허용 origin 목록, 쉼표로 구분
- `CHAT_WS_CORS_ORIGINS`: WebSocket CORS 허용 origin 목록, 비어 있으면 `CORS_ORIGINS` 사용

### DB

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `DB_SYNCHRONIZE`
- `DB_LOGGING`

### Redis

- `REDIS_HOST`
- `REDIS_PORT`

### 인증/로그인

- `SECRET_KEY`
- `ACCESS_EXPIRATION`
- `AUTH_CODE_EXPIRATION`
- `OAUTH_REDIRECT_URL`
- `MEMBER_REDIRECT_URL`
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_REDIRECT_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

참고:

- production에서는 `OAUTH_REDIRECT_URL`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI` 누락 시 부팅 단계에서 에러가 납니다.

### 메일

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`

### AWS S3

- `AWS_ACCESS_KEY`
- `AWS_SECRET_KEY`
- `BUCKET_REGION`
- `BUCKET_NAME`

### Firebase

- `FIREBASE_CONFIG_PATH`: 로컬 또는 secret mount로 주입한 JSON 파일 경로
- `FIREBASE_SERVICE_ACCOUNT_BASE64`: 런타임에 주입한 service account JSON의 base64 값

참고:

- 두 값 중 하나가 필요하며, 둘 다 있으면 `FIREBASE_SERVICE_ACCOUNT_BASE64`를 우선 사용합니다.
- `firebase-service-account.json` 같은 실제 credential 파일은 저장소나 Docker 이미지에 포함하지 않습니다.

### 토스 결제

- `TOSS_PAYMENTS_SECRET_KEY`
- `TOSS_PAYMENTS_API_BASE_URL`

기본값:

- `TOSS_PAYMENTS_API_BASE_URL=https://api.tosspayments.com`

### 환전 정책

- `WITHDRAW_MINIMUM_COIN_AMOUNT`
- `WITHDRAW_COIN_UNIT`
- `WITHDRAW_CASH_PER_COIN`
- `WITHDRAW_FLAT_FEE_AMOUNT`
- `WITHDRAW_ACCOUNT_SECRET`

기본값:

- `WITHDRAW_MINIMUM_COIN_AMOUNT=10`
- `WITHDRAW_COIN_UNIT=10`
- `WITHDRAW_CASH_PER_COIN=100`
- `WITHDRAW_FLAT_FEE_AMOUNT=0`

`WITHDRAW_ACCOUNT_SECRET`은 환전계좌 암호화에 사용되며 운영 환경에서는 필수입니다.

### 앱 정보

- `APP_VERSION`
- `MIN_SUPPORTED_VERSION`
- `SUPPORT_EMAIL`
- `SUPPORT_HOURS`
- `PRIVACY_POLICY_URL`

참고:

- `APP_VERSION`은 현재 배포 버전 값으로 사용됩니다.
- `MIN_SUPPORTED_VERSION`, `SUPPORT_EMAIL`, `SUPPORT_HOURS`, `PRIVACY_POLICY_URL`는 DB 저장값이 있으면 DB 값을 우선 사용합니다.

### 시드

- `SEED_DEFAULT_DATA`
- `SEED_ADMIN_ID`

동작:

- `SEED_DEFAULT_DATA=false` 이면 기본 시드를 실행하지 않습니다.
- 코인 상품은 누락된 기본 상품만 자동 생성합니다.
- 약관은 `SEED_ADMIN_ID`가 있고 해당 관리자 회원이 존재할 때만 누락분을 생성합니다.

## 기본 시드

앱 부팅 시 아래 초기 데이터가 자동으로 보강될 수 있습니다.

- 코인 상품
  - `10 / 30 / 50 / 100` 코인 기본 상품
- 약관
  - 서비스 이용약관
  - 개인정보 처리방침

## 주요 운영 API

### 설정/운영

- `GET /api/settings/v1/summary`
- `GET /api/settings/v1/notifications`
- `PATCH /api/settings/v1/notifications`
- `GET /api/settings/v1/app-info`
- `PATCH /api/settings/v1/admin/app-info`
- `GET /api/terms/v1`
- `POST /api/terms/v1`
- `PATCH /api/terms/v1/:id`
- `DELETE /api/terms/v1/:id`

### 인증/회원

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/profile`
- `DELETE /api/member/v1/withdraw`

### 공지/문의

- `GET /api/notice/v1`
- `GET /api/notice/v1/admin`
- `POST /api/notice/v1`
- `PATCH /api/notice/v1/:id`
- `DELETE /api/notice/v1/:id`
- `POST /api/inquiry/v1`
- `GET /api/inquiry/v1/admin`
- `GET /api/inquiry/v1/admin/:id`
- `PATCH /api/inquiry/v1/admin/:id`

### 채팅/실시간

- `POST /api/chats`
- `GET /api/chats`
- `GET /api/chats/:id`
- `DELETE /api/chats/:id`
- `POST /api/chats/request-images/upload-url`
- `GET /api/chats/:id/messages`
- `POST /api/chats/:id/messages`
- `POST /api/chats/:id/messages/image-upload`
- `PATCH /api/chats/:id/read`
- `PATCH /api/chats/:id/request`
- `PATCH /api/chats/:id/accept`
- `PATCH /api/chats/:id/reject`
- `PATCH /api/chats/:id/cancel`
- `PATCH /api/chats/:id/request-price-change`
- `PATCH /api/chats/:id/pay`
- `PATCH /api/chats/:id/start`
- `POST /api/chats/:id/send-drawing`
- `POST /api/chats/:id/revision`
- `PATCH /api/chats/:id/confirm`

### 코인/지갑

- `GET /api/coin-shop/v1/products`
- `GET /api/coin-shop/v1/admin/products`
- `POST /api/coin-shop/v1/admin/products`
- `PATCH /api/coin-shop/v1/admin/products/:id`
- `POST /api/coin-shop/v1/orders`
- `POST /api/coin-shop/v1/orders/:id/confirm`
- `POST /api/coin-shop/v1/orders/:id/cancel`
- `GET /api/coin-shop/v1/admin/orders`
- `GET /api/coin-shop/v1/admin/orders/:id`
- `POST /api/payments/v1/webhooks/toss`

### 환전

- `GET /api/withdraw/v1/policy`
- `POST /api/withdraw/v1/requests`
- `GET /api/withdraw/v1/admin/requests`
- `GET /api/withdraw/v1/admin/requests/:id`
- `PATCH /api/withdraw/v1/admin/requests/:id`
- `GET /api/withdraw-accounts/v1/admin`
- `GET /api/withdraw-accounts/v1/admin/:id`
- `PATCH /api/withdraw-accounts/v1/admin/:id/verify`

## 채팅 WebSocket

채팅은 REST API로 방 생성, 상태 변경, 이미지 업로드 URL 발급 같은 명령을 처리하고, Socket.IO WebSocket으로 메시지/읽음/상태 변경 이벤트를 실시간 전달합니다.

### 연결

- namespace: `/chats`
- 예시 URL: `http://localhost:3000/chats`
- CORS 허용 origin: `CHAT_WS_CORS_ORIGINS`를 사용하며, 값이 없으면 `CORS_ORIGINS`를 사용합니다.
- 인증: JWT access token 필요
- 토큰 전달 방법:
  - Socket.IO auth: `{ token: '<access-token>' }`
  - 또는 handshake header: `Authorization: Bearer <access-token>`
- 연결 성공 시 서버는 해당 소켓을 회원 개인 room인 `member:{memberId}`에 자동 입장시키고 `connection:ready`를 발행합니다.
- 토큰 누락, 블랙리스트 토큰, 비활성/탈퇴 회원은 `connection:error` 발행 후 연결을 종료합니다.

클라이언트 연결 예시:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chats', {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
});

socket.on('connection:ready', ({ memberId }) => {
  console.log('connected member:', memberId);
});
```

### 클라이언트 발행 이벤트

| Event          | Payload                                                                          | Response event     | 설명                                                                       |
| -------------- | -------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| `chat:join`    | `{ chatRoomId }`                                                                 | `chat:joined`      | 채팅방 접근 권한을 확인하고 `chat:{chatRoomId}` room에 입장합니다.         |
| `chat:leave`   | `{ chatRoomId }`                                                                 | `chat:left`        | `chat:{chatRoomId}` room에서 퇴장합니다.                                   |
| `message:send` | `{ chatRoomId, type?, content?, objectKey?, size?, mimeType?, width?, height? }` | `message:sent`     | REST 메시지 전송과 같은 서비스 로직으로 텍스트/이미지 메시지를 생성합니다. |
| `message:read` | `{ chatRoomId, lastReadMessageId? }`                                             | `message:read:ack` | 상대방이 보낸 미읽음 메시지를 읽음 처리합니다.                             |

`message:send`의 `type` 기본값은 `TEXT`입니다. 이미지 메시지는 먼저 `POST /api/chats/:id/messages/image-upload`으로 presigned upload URL과 `objectKey`를 받은 뒤, S3 업로드 완료 후 `type=IMAGE`와 `objectKey`를 전송합니다.

### 서버 발행 이벤트

| Event                | 대상 room                                   | 주요 payload                                                | 발생 시점                                                                       |
| -------------------- | ------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `connection:ready`   | 연결 소켓                                   | `{ memberId }`                                              | WebSocket 인증 성공                                                             |
| `connection:error`   | 연결 소켓                                   | `{ message }`                                               | WebSocket 인증 실패                                                             |
| `chat:created`       | `member:{requesterId}`, `member:{artistId}` | `{ chatRoomId, chatRoom }`                                  | 채팅방 신규 생성                                                                |
| `chat:updated`       | `member:{requesterId}`, `member:{artistId}` | `{ chatRoomId, ... }`                                       | 마지막 메시지, 읽음, 상세 정보, 상태 변경 등 채팅방 목록 갱신 필요 시           |
| `chat:statusChanged` | `chat:{chatRoomId}`                         | `{ chatRoomId, previousStatus, status, chatRoom?, ... }`    | 수락, 거절, 취소, 결제, 작업 시작, 시안 전송, 수정 요청, 최종 확인 등 상태 변경 |
| `chat:deleted`       | `chat:{chatRoomId}`, 참여자 개인 room       | `{ chatRoomId, deletedByMemberId }`                         | 채팅방 삭제                                                                     |
| `message:created`    | `chat:{chatRoomId}`                         | `MessageResponseDto`                                        | REST 또는 WebSocket으로 메시지/시스템 카드 생성                                 |
| `message:read`       | `chat:{chatRoomId}`                         | `{ chatRoomId, readerId, lastReadMessageId, updatedCount }` | 읽음 처리                                                                       |

채팅방 상세를 실시간으로 보고 싶은 클라이언트는 연결 후 `chat:join`을 호출해 `chat:{chatRoomId}` room에 들어가야 합니다. 채팅 목록 화면은 자동 입장되는 `member:{memberId}` room의 `chat:created`, `chat:updated`, `chat:deleted` 이벤트를 구독하면 됩니다.

### 통합 테스트 기준

WebSocket 통합 테스트는 다음 흐름을 기준으로 추가합니다.

- JWT access token으로 Socket.IO client가 `/chats` namespace에 연결되고 `connection:ready`를 받는지 확인
- 잘못된 토큰 또는 누락된 토큰이면 `connection:error` 후 연결이 종료되는지 확인
- 참여자가 `chat:join`을 호출하면 `chat:joined`를 받고, 비참여자는 입장할 수 없는지 확인
- 한 사용자가 `message:send`를 호출하면 같은 채팅방 room의 다른 소켓이 `message:created`를 받는지 확인
- REST `POST /api/chats/:id/messages`로 생성한 메시지도 `message:created`로 전달되는지 확인
- `message:read` 호출 시 `message:read`와 `chat:updated`가 필요한 room에 전달되는지 확인
- 상태 변경 REST API, 예를 들어 `PATCH /api/chats/:id/accept`, `PATCH /api/chats/:id/pay`, `PATCH /api/chats/:id/confirm` 실행 후 `chat:statusChanged`와 `chat:updated`가 발행되는지 확인

## 운영 메모

- 운영 배포는 `DB_SYNCHRONIZE=false`로 실행합니다.
- 로컬 개발은 필요할 때만 `DB_SYNCHRONIZE=true`로 빠르게 맞출 수 있습니다.
- 스테이징/운영 스키마 변경은 마이그레이션 실행을 권장합니다.
- `.env`에는 실제 비밀값을 직접 커밋하지 않는 것을 권장합니다.
- Firebase credential은 Docker 이미지에 복사하지 않으며, 배포 환경에서 `FIREBASE_SERVICE_ACCOUNT_BASE64` 또는 secret mount 파일로 주입해야 합니다.
- 로그아웃은 현재 서버 성공 응답 후 프론트에서 access token을 삭제하는 방식입니다.
- 비활성 또는 탈퇴 회원은 일반 로그인, 소셜 로그인, JWT 인증 모두 차단됩니다.
