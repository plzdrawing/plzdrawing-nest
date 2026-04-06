# PlzDrawing Backend

NestJS 기반 `plzdrawing` 백엔드입니다.  
현재 저장소에는 아래 기능이 포함되어 있습니다.

- 회원/프로필 수정 및 닉네임 검증
- 설정 홈, 알림 설정, 앱 정보, 약관 조회/관리
- 공지사항, 1:1 문의, 관리자 운영 API
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

### DB

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `DB_SYNCHRONIZE`

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

- `FIREBASE_CONFIG_PATH`

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
- `WITHDRAW_ACCOUNT_SECRET=plzdrawing-withdraw-account-secret`

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

## 운영 메모

- 현재 DB 연결은 `TypeORM synchronize` 기반입니다.
- 운영 환경에서는 마이그레이션 기반으로 전환하는 것을 권장합니다.
- `.env`에는 실제 비밀값을 직접 커밋하지 않는 것을 권장합니다.
