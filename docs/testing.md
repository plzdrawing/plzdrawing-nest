# 테스트 가이드

이 문서는 PlzDrawing 백엔드에서 변경 범위별로 어떤 테스트를 작성하고 실행할지 정리한다. 목적은 매번 전체 테스트만 기계적으로 돌리는 것이 아니라, 변경 리스크에 맞는 검증 범위를 빠르게 선택하는 것이다.

## 기본 명령

빌드 확인:

```bash
pnpm build
```

전체 단위 테스트:

```bash
pnpm test
```

커버리지 확인:

```bash
pnpm test:cov
```

특정 스펙만 실행:

```bash
./node_modules/.bin/jest --runInBand --watchman=false src/path/to/file.spec.ts
```

WebSocket 통합 테스트처럼 실제 로컬 포트를 여는 스펙은 단독 실행을 우선한다.

```bash
./node_modules/.bin/jest --runInBand --watchman=false src/chat/chat.gateway.integration.spec.ts
```

## 커버리지 기준

현재 Jest global coverage threshold는 아래 기준을 사용한다.

| Metric     | Threshold |
| ---------- | --------- |
| statements | 70%       |
| branches   | 55%       |
| functions  | 50%       |
| lines      | 70%       |

커버리지 결과는 아래 위치에서 확인한다.

- 터미널 요약
- `coverage/lcov-report/index.html`
- `coverage/coverage-summary.json`

## 테스트 종류

### DTO validation test

입력 계약을 바꿀 때 작성한다.

확인할 것:

- 필수값 누락
- enum 허용 범위
- 문자열/숫자 변환
- 빈 문자열, 음수, 0 같은 경계값
- whitelist와 forbidNonWhitelisted에 걸릴 필드

예시:

- `src/chat/dto/send-message.dto.spec.ts`
- `src/auth/dto/create-member.dto.spec.ts`

### Service unit test

비즈니스 규칙을 바꿀 때 가장 먼저 보강한다.

확인할 것:

- 정상 상태 전이
- 권한 검사
- 예외 케이스
- repository 호출 조건
- 트랜잭션 안에서 저장되는 데이터
- 같은 요청이 반복됐을 때 중복 처리 여부

결제, 지갑, 환전처럼 금액성 데이터가 움직이는 기능은 service test를 필수로 둔다.

### Controller test

route, guard, request/response 계약을 바꿀 때 작성한다.

확인할 것:

- endpoint path
- HTTP method
- guard 적용
- query/body/param DTO 연결
- service 호출 인자
- response DTO shape

관리자 API를 추가하면 controller test와 service test를 함께 두는 것을 기준으로 한다.

### Gateway test

WebSocket gateway의 인증, room 입장, ack/error 형식을 바꿀 때 작성한다.

확인할 것:

- JWT token 추출 방식
- blacklist token 차단
- 비활성/탈퇴 회원 연결 차단
- `chat:join`, `chat:leave` room 처리
- `message:send`, `message:read` ack
- 실패 시 표준 ack와 `chat:error`

### Integration test

여러 계층이 함께 맞물리는 흐름을 검증할 때 작성한다.

현재 WebSocket 통합 테스트는 Nest app을 만들고 `127.0.0.1`의 임시 포트로 listen한 뒤 `socket.io-client`로 실제 연결한다. 그래서 병렬 실행보다 `--runInBand` 단독 실행이 안정적이다.

확인할 것:

- 실제 Socket.IO 연결 이벤트
- room broadcast 수신
- ack callback 응답
- 인증 실패 연결 종료
- REST 처리 후 WebSocket 이벤트 발행

### Entity/migration test

인덱스, 컬럼, enum, source dedup 같은 DB 계약을 바꿀 때 작성한다.

확인할 것:

- unique index 컬럼 조합
- nullable/default 계약
- enum 값과 애플리케이션 enum 일치
- migration up/down 쿼리 방향

## 변경 유형별 실행 기준

| 변경 유형              | 최소 실행                                  | 추가 권장                                  |
| ---------------------- | ------------------------------------------ | ------------------------------------------ |
| 문서만 변경            | `git diff --check`                         | markdown prettier                          |
| DTO validation 변경    | 해당 DTO spec                              | 관련 controller/service spec               |
| service 로직 변경      | 해당 service spec                          | 관련 controller spec, `pnpm build`         |
| 결제/지갑/환전 변경    | 해당 service spec, entity spec             | `pnpm test:cov`, 관리자 감사 API 수동 확인 |
| WebSocket gateway 변경 | gateway spec, gateway integration spec     | `/chat-test` 수동 확인                     |
| CORS/부팅 설정 변경    | 관련 config spec, `pnpm build`             | 로컬 서버 smoke test                       |
| Swagger DTO 변경       | 관련 controller/service spec, `pnpm build` | `/api-docs-json` 수동 확인                 |
| migration 추가         | entity/migration 관련 spec                 | staging DB에서 migration show/run          |

## 금액성 기능 테스트 기준

결제/지갑/환전 기능은 아래 케이스를 우선한다.

- 정상 처리 시 잔액과 원장이 같은 트랜잭션으로 반영된다.
- 같은 source에서 같은 type 원장이 중복 생성되지 않는다.
- 이미 완료된 요청 재시도는 중복 충전/차감하지 않는다.
- 외부 결제 상태가 내부 주문과 다르면 반영하지 않는다.
- 실패/취소/환불 상태 전이가 명확하다.
- 관리자 감사 API로 잔액 불일치와 source 중복을 탐지할 수 있다.

상세 원장 규칙은 [결제/지갑 거래원장](payment-ledger.md)을 따른다.

## WebSocket 테스트 기준

WebSocket 변경은 아래 케이스를 우선한다.

- 정상 token으로 연결하면 `connection:ready`를 받는다.
- token 누락, 잘못된 token, blacklist token은 연결이 종료된다.
- 연결 성공 시 `member:{memberId}` room에 자동 입장한다.
- 참여자는 `chat:join`에 성공하고 비참여자는 실패한다.
- 잘못된 payload는 실패 ack와 `chat:error`를 만든다.
- `message:send`는 `message:sent` ack와 `message:created` broadcast를 만든다.
- `message:read`는 `message:read:ack`와 `message:read` broadcast를 만든다.
- REST 상태 변경 후 `chat:statusChanged`, `chat:updated`가 필요한 room에 전달된다.

상세 이벤트 계약은 [채팅 WebSocket](websocket.md)을 따른다.

## PR 전 체크리스트

1. 변경 파일을 확인한다.
2. 변경 유형에 맞는 최소 테스트를 실행한다.
3. service 또는 DTO 계약이 바뀌었으면 관련 spec을 추가/수정한다.
4. `pnpm build`로 타입과 Swagger metadata 생성을 확인한다.
5. 금액성 기능이면 중복 호출, 실패 재시도, 취소/환불 케이스를 확인한다.
6. WebSocket 기능이면 ack/error 형식과 room broadcast를 확인한다.
7. 운영 영향이 있으면 [운영/배포 체크리스트](operations.md)를 수정한다.
8. 새 API 또는 이벤트가 있으면 README 또는 `docs/` 문서를 수정한다.
