# 운영/배포 체크리스트

이 문서는 EC2 같은 서버 환경에 PlzDrawing 백엔드를 배포하고 운영할 때 확인해야 할 항목을 정리한다. 실제 명령은 배포 방식에 따라 달라질 수 있으므로, 여기서는 순서와 판단 기준을 중심으로 관리한다.

## 운영 기본값

운영 환경에서는 아래 값을 기본으로 둔다.

```env
NODE_ENV=production
DB_SYNCHRONIZE=false
DB_LOGGING=false
SWAGGER_ENABLED=false
SEED_DEFAULT_DATA=false
```

Swagger는 내부 확인이 필요할 때만 임시로 켠다. 공개 서버에서 켜야 한다면 방화벽, 프록시 인증, IP allow-list 같은 보호 장치를 먼저 둔다.

## 환경변수 분류

### 서버

- `PORT`: 애플리케이션 listen port
- `NODE_ENV`: production/development 구분
- `SWAGGER_ENABLED`: Swagger 노출 여부
- `CORS_ORIGINS`: HTTP CORS 허용 origin 목록
- `CHAT_WS_CORS_ORIGINS`: WebSocket CORS 허용 origin 목록, 없으면 `CORS_ORIGINS`

RN 앱만 있는 단계에서는 FE 배포 주소가 없어도 된다. 네이티브 앱은 브라우저 CORS의 직접 적용 대상이 아니므로, 운영 API origin과 브라우저 테스트에 필요한 origin만 넣는다.

예시:

```env
CORS_ORIGINS=http://localhost:3000,https://plzdrawing.o-r.kr
CHAT_WS_CORS_ORIGINS=http://localhost:3000,https://plzdrawing.o-r.kr
```

Expo나 웹 테스트 페이지를 별도로 쓰면 해당 origin을 추가한다.

### DB/Redis

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `DB_SYNCHRONIZE`
- `DB_LOGGING`
- `REDIS_HOST`
- `REDIS_PORT`

운영 DB는 migration으로만 스키마를 바꾸는 것을 기준으로 한다.

### 인증/OAuth

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

production에서는 Kakao 관련 필수값이 없으면 부팅 단계에서 실패한다.

### 외부 서비스

- Mail: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- AWS S3: `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `BUCKET_REGION`, `BUCKET_NAME`
- Firebase: `FIREBASE_ENABLED`, `FIREBASE_SERVICE_ACCOUNT_BASE64` 또는 `FIREBASE_CONFIG_PATH`
- Toss: `TOSS_PAYMENTS_SECRET_KEY`, `TOSS_PAYMENTS_API_BASE_URL`

credential 파일은 저장소와 Docker 이미지에 포함하지 않는다. 가능하면 base64 secret, secret manager, secret mount 중 하나로 런타임에 주입한다.

로컬에서 채팅처럼 push 알림과 무관한 기능만 테스트한다면 `FIREBASE_ENABLED=false`로 credential 없이 부팅할 수 있다. 운영에서는 `FIREBASE_ENABLED=true`와 실제 credential 주입을 기준으로 한다.

### 환전/앱 정보/시드

- `WITHDRAW_MINIMUM_COIN_AMOUNT`
- `WITHDRAW_COIN_UNIT`
- `WITHDRAW_CASH_PER_COIN`
- `WITHDRAW_FLAT_FEE_AMOUNT`
- `WITHDRAW_ACCOUNT_SECRET`
- `APP_VERSION`
- `MIN_SUPPORTED_VERSION`
- `SUPPORT_EMAIL`
- `SUPPORT_HOURS`
- `PRIVACY_POLICY_URL`
- `SEED_DEFAULT_DATA`
- `SEED_ADMIN_ID`

`WITHDRAW_ACCOUNT_SECRET`은 운영 환경에서 필수다. 이미 암호화된 계좌 데이터가 있으면 값을 바꾸면 복호화가 깨질 수 있으므로 별도 마이그레이션 계획 없이 변경하지 않는다.

## 배포 전 체크리스트

1. `.env` 또는 서버 환경변수에 필수값이 모두 있는지 확인한다.
2. `DB_SYNCHRONIZE=false`인지 확인한다.
3. `pnpm build`가 성공하는지 확인한다.
4. 변경 범위의 테스트를 실행한다.
5. migration 목록을 확인한다.
6. 금액성 migration이면 운영 DB 백업 또는 스냅샷을 먼저 확인한다.
7. 결제/지갑 변경이 있으면 관리자 감사 API로 중복/불일치를 점검한다.
8. Swagger를 운영에서 노출할지 결정한다.
9. 배포 후 smoke test 계정을 준비한다.

## Migration 실행 기준

실행 전:

```bash
pnpm db:migration:show
```

실행:

```bash
pnpm db:migration:run
```

되돌리기:

```bash
pnpm db:migration:revert
```

주의:

- 운영에서는 `DB_SYNCHRONIZE=true`로 스키마를 맞추지 않는다.
- unique index 추가 전에는 대상 테이블에 중복 데이터가 없는지 먼저 확인한다.
- 지갑 원장 관련 migration은 [결제/지갑 거래원장](payment-ledger.md)의 체크리스트를 따른다.

## 배포 후 Smoke Test

### 서버 기본

- `GET /api` 또는 health 성격의 기본 endpoint가 응답하는지 확인한다.
- Swagger를 켠 환경이면 `/api-docs`와 `/api-docs-json`이 열리는지 확인한다.
- 허용되지 않은 origin에서 브라우저 요청이 차단되는지 확인한다.

### 인증/회원

- 일반 로그인 또는 테스트 계정 로그인이 되는지 확인한다.
- 탈퇴/비활성 회원 로그인이 차단되는지 확인한다.
- 로그아웃 후 기존 token 사용이 차단되는지 확인한다.

### 채팅/WebSocket

- 개발 환경에서는 `/chat-test`, 운영 환경에서는 RN 앱 또는 별도 테스트 클라이언트로 `/chats` namespace 연결을 확인한다.
- 정상 token은 `connection:ready`를 받는다.
- 잘못된 token은 `connection:error` 후 연결 종료된다.
- 채팅방 입장, 메시지 전송, 읽음 처리 이벤트가 수신되는지 확인한다.

상세 계약은 [채팅 WebSocket](websocket.md)을 따른다.

### 결제/지갑

- 코인 상품 목록이 조회되는지 확인한다.
- 테스트 결제 승인 후 지갑 잔액과 거래원장이 같이 반영되는지 확인한다.
- Toss webhook 수신 endpoint가 200으로 응답하는지 확인한다.
- 관리자 감사 API에서 잔액 불일치와 source 중복이 없는지 확인한다.

### 환전

- 환전 정책 조회가 되는지 확인한다.
- 환전계좌 등록/관리자 인증 흐름이 동작하는지 확인한다.
- 환전 신청 후 지갑 원장이 차감되는지 확인한다.

## 장애 대응 메모

### WebSocket 연결 실패

확인 순서:

1. access token이 누락됐거나 만료됐는지 확인한다.
2. token이 로그아웃 blacklist에 들어갔는지 확인한다.
3. 회원 상태가 `ACTIVE`이고 탈퇴 상태가 아닌지 확인한다.
4. `CHAT_WS_CORS_ORIGINS`에 테스트 origin이 있는지 확인한다.
5. 프록시가 WebSocket upgrade header를 통과시키는지 확인한다.

### 결제 웹훅 지연 또는 중복

확인 순서:

1. Toss paymentKey로 결제 상태를 조회한다.
2. 내부 `coin_order` 상태와 `paymentKey`, `orderCode`, 금액을 비교한다.
3. `wallet_transaction`에 `COIN_ORDER` source 원장이 있는지 확인한다.
4. 관리자 감사 API로 잔액 불일치와 source 중복을 확인한다.
5. 보정이 필요하면 수동 SQL보다 별도 보정 스크립트 또는 복구 API를 우선 검토한다.

### 지갑 잔액 불일치

확인 순서:

1. `GET /api/wallet/v1/admin/audit/balance-mismatches`를 조회한다.
2. 해당 회원의 거래원장을 source별로 확인한다.
3. `GET /api/wallet/v1/admin/audit/duplicate-transaction-sources`를 조회한다.
4. 결제, 채팅 결제, 환전 중 어느 경로에서 차이가 났는지 추적한다.
5. 복구 기준을 원장 합계로 둘지 현재 잔액으로 둘지 결정한 뒤 보정한다.

## 운영 문서 갱신 규칙

아래 변경이 있으면 문서도 함께 수정한다.

- 환경변수 추가/삭제
- 운영 배포 순서 변경
- migration 추가
- 외부 연동 설정 변경
- WebSocket 이벤트 추가/삭제
- 결제/지갑/환전 상태 전이 변경
- 관리자 감사 API 추가
