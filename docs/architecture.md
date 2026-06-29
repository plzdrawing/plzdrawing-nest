# 프로젝트 구조

이 문서는 PlzDrawing 백엔드의 현재 구조와 주요 책임 경계를 정리한다. 새 기능을 붙이거나 리팩터링할 때 어느 모듈을 먼저 봐야 하는지 빠르게 판단하는 것을 목표로 한다.

## 프로젝트 성격

PlzDrawing은 그림 의뢰자와 작가를 연결하는 모바일 앱 백엔드다. 게시글과 프로필을 통해 작가를 탐색하고, 채팅방에서 의뢰 조건을 조율한 뒤, 코인 결제와 작업 상태 변경을 처리한다. 운영자는 공지, 문의, 약관, 앱 정보, 코인 상품, 주문, 환전 계좌, 환전 신청을 관리한다.

## 런타임 구성

- Framework: NestJS
- DB: MySQL, TypeORM
- Cache/infra: Redis
- Auth: JWT, Passport, Kakao OAuth, Google OAuth
- Realtime: Socket.IO namespace `/chats`
- Storage: AWS S3 presigned URL
- Push/notification: Firebase Admin SDK
- Payment: Toss Payments
- API docs: Swagger `/api-docs`

## 애플리케이션 진입점

`src/main.ts`에서 전역 설정을 구성한다.

- global prefix: `/api`
- global validation: whitelist, forbidNonWhitelisted, transform
- global serializer: `ClassSerializerInterceptor`
- global error filter: `HttpExceptionFilter`
- HTTP CORS: `CORS_ORIGINS`
- WebSocket CORS: `CHAT_WS_CORS_ORIGINS`, 없으면 `CORS_ORIGINS`
- Swagger: `SWAGGER_ENABLED !== false`일 때 `/api-docs`, `/api-docs-json`

`/chat-test`는 WebSocket 수동 테스트 페이지라서 global prefix 예외로 둔다.

## 모듈 책임

| Module                  | 주요 책임                                         |
| ----------------------- | ------------------------------------------------- |
| `AuthModule`            | 회원가입, 로그인, 소셜 로그인, JWT 인증, 로그아웃 |
| `MemberModule`          | 회원/프로필 조회와 수정, 닉네임 중복 확인, 탈퇴   |
| `PostModule`            | 게시글, 피드, 이미지, 태그 기반 콘텐츠            |
| `ChatModule`            | 의뢰 채팅방, 메시지, 상태 변경, 실시간 이벤트     |
| `WalletModule`          | 코인 상품, 주문, Toss 결제, 지갑, 거래원장        |
| `WithdrawModule`        | 환전 정책, 환전 신청, 관리자 처리                 |
| `WithdrawAccountModule` | 환전 계좌 등록, 수정, 관리자 인증                 |
| `SettingsModule`        | 설정 홈, 앱 정보, 알림 설정, 약관                 |
| `NoticeModule`          | 공지사항 사용자/관리자 API                        |
| `InquiryModule`         | 1:1 문의 사용자/관리자 API                        |
| `AlarmModule`           | 알림 발송/조회 기반 기능                          |
| `AppInitModule`         | 앱 부팅 시 기본 데이터 보강                       |

## 요청 처리 공통 규칙

HTTP 요청은 컨트롤러에서 DTO validation을 거쳐 서비스로 이동한다.

- request DTO는 `class-validator`로 입력 제약을 둔다.
- response DTO는 Swagger와 클라이언트 계약을 기준으로 명시한다.
- 인증이 필요한 API는 `AuthGuard('jwt')`와 `@ApiBearerAuth('access-token')`를 함께 둔다.
- 관리자 API는 서비스 레이어에서 관리자 권한을 확인한다.
- 예외 응답은 `HttpExceptionFilter`가 아래 형식으로 정리한다.

```json
{
  "statusCode": 400,
  "timestamp": "2026-06-22T00:00:00.000Z",
  "path": "/api/example",
  "error": "BadRequestException",
  "message": "..."
}
```

## 데이터 변경 원칙

금액성 데이터와 상태 전이는 서비스 레이어에서 트랜잭션으로 묶는다.

- 지갑 잔액 변경과 거래원장 생성은 같은 트랜잭션에서 처리한다.
- 결제, 환전, 채팅 결제처럼 중복 호출 위험이 있는 경로는 source 기반 중복 방어를 둔다.
- 상태 전이가 중요한 row는 필요한 시점에 pessimistic lock을 사용한다.
- 운영 스키마 변경은 `DB_SYNCHRONIZE=false`와 migration 실행을 기준으로 한다.

결제/지갑 상세 규칙은 [결제/지갑 거래원장](payment-ledger.md)을 기준으로 관리한다.

## 실시간 이벤트 구조

채팅 실시간 기능은 REST 명령과 Socket.IO 이벤트를 함께 사용한다.

- REST API: 방 생성, 상태 변경, 이미지 upload URL 발급, 메시지 조회 같은 명령 처리
- WebSocket: 메시지 생성, 읽음, 방 생성/삭제, 상태 변경 이벤트 전달
- 개인 room: `member:{memberId}`
- 채팅방 room: `chat:{chatRoomId}`

서버 발행은 `ChatRealtimeService`를 통해 room 단위로 수행한다. WebSocket 계약은 [채팅 WebSocket](websocket.md)을 기준으로 관리한다.

## 외부 연동 경계

| 연동          | 코드 위치                                | 운영 시 주의점                                    |
| ------------- | ---------------------------------------- | ------------------------------------------------- |
| Toss Payments | `src/wallet/toss-payments.service.ts`    | secret key 주입, webhook 재조회/검증, 금액 보정   |
| AWS S3        | `src/common/aws/aws.service.ts`          | credential 미커밋, bucket/region 환경변수 확인    |
| Firebase      | `src/common/firebase/firebase.module.ts` | base64 secret 또는 secret mount로 credential 주입 |
| OAuth         | `src/auth/strategies/*`                  | production redirect URI와 client secret 확인      |
| Redis         | `src/common/redis/redis.module.ts`       | host/port 연결성, 장애 시 인증/캐시 영향 확인     |

## 테스트 기준

현재 테스트는 단위 테스트 중심이며, 변경 범위가 커질수록 아래 기준으로 보강한다.

- DTO validation: 입력 제약이 클라이언트 계약에 맞는지 확인
- Service unit test: 상태 전이, 권한, 트랜잭션 결과, 중복 방어 확인
- Gateway test: WebSocket 인증, room 입장, ack/error 형식 확인
- Integration test: REST와 WebSocket 이벤트가 함께 동작하는 흐름 확인
- Entity/migration test: 인덱스나 컬럼 계약이 의도대로 잡혔는지 확인

## 변경 시 확인 순서

1. 관련 controller/service/dto/entity를 먼저 확인한다.
2. 기존 테스트가 다루는 계약을 확인한다.
3. Swagger response DTO가 실제 반환값과 맞는지 확인한다.
4. 금액성 기능이면 원장 source와 중복 방어를 확인한다.
5. 채팅 기능이면 REST 응답과 WebSocket 이벤트를 함께 확인한다.
6. 운영 영향이 있으면 [운영/배포 체크리스트](operations.md)에 반영한다.
