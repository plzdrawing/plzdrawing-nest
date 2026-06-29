# 결제/지갑 거래원장

이 문서는 PlzDrawing의 코인 결제, 지갑 잔액, 거래원장 처리 규칙을 정리한다. 목적은 결제/환전처럼 금액성 데이터가 움직이는 기능에서 중복 반영, 부분 실패, 웹훅 지연, 운영 DB 점검 절차를 명확히 하는 것이다.

## 핵심 원칙

- `wallet.balance`는 회원의 현재 코인 잔액이다.
- `wallet_transaction`은 잔액 변경과 관련된 원장이다.
- 잔액 변경과 원장 생성은 같은 DB 트랜잭션 안에서 처리한다.
- 잔액을 변경할 때는 관련 wallet 또는 주문 row에 pessimistic lock을 사용한다.
- 같은 원천 이벤트에서 같은 회원의 같은 거래 타입이 중복 생성되지 않도록 `memberId + type + sourceType + sourceId` 조합을 중복 방지 키로 사용한다.
- Toss 웹훅은 payload만 신뢰하지 않고 `paymentKey`로 Toss 결제 조회를 다시 수행한 뒤 주문번호, 결제키, 금액을 검증한다.

## 원장 source 규칙

| sourceType         | sourceId        | type                | coinAmount | 의미                           |
| ------------------ | --------------- | ------------------- | ---------- | ------------------------------ |
| `COIN_ORDER`       | `coin_order.id` | `CHARGE`            | `+`        | 코인 충전                      |
| `COIN_ORDER`       | `coin_order.id` | `REFUND`            | `-`        | 코인 충전 결제 취소            |
| `CHAT_PAYMENT`     | `chat_room.id`  | `USE`               | `-`        | 요청자의 의뢰 결제             |
| `CHAT_PAYMENT`     | `chat_room.id`  | `EARN`              | `+`        | 작가의 작업 수익               |
| `WITHDRAW_REQUEST` | `withdraw.id`   | `WITHDRAW_REQUEST`  | `-`        | 환전 신청으로 코인 차감        |
| `WITHDRAW_REQUEST` | `withdraw.id`   | `WITHDRAW_CANCEL`   | `+`        | 환전 반려/취소로 코인 복구     |
| `WITHDRAW_REQUEST` | `withdraw.id`   | `WITHDRAW_COMPLETE` | `0`        | 환전 완료 기록, 잔액 변동 없음 |

## 코인 주문 상태 전이

코인 주문은 Toss 결제를 통해 생성되고 승인된다.

```text
PENDING
  -> COMPLETED  결제 승인 API 성공 또는 Toss DONE 웹훅 보정
  -> FAILED     Toss ABORTED/EXPIRED 웹훅
  -> CANCELLED  Toss CANCELED 웹훅 또는 완료 주문 취소 API

COMPLETED
  -> CANCELLED  주문 취소 API 성공 또는 Toss CANCELED 웹훅 보정
```

현재 처리 규칙:

- 주문 생성 시 `PENDING` 상태와 `orderCode`를 만든다.
- 결제 승인 API는 주문 row를 lock으로 잡고 `PENDING` 주문만 승인한다.
- 이미 `COMPLETED`이고 같은 `paymentKey`, 같은 금액이면 재시도를 성공 응답으로 처리하고 잔액/원장은 다시 반영하지 않는다.
- 다른 주문에 이미 사용된 `paymentKey`는 거부한다.
- Toss 승인 응답이 `DONE`이 아니거나 주문번호/금액이 다르면 완료 처리하지 않는다.
- 취소 API는 `COMPLETED` 주문만 취소한다.
- 이미 `CANCELLED`인 주문 취소 재시도는 성공 응답으로 처리하고 잔액/원장은 다시 반영하지 않는다.

## Toss 웹훅 보정

Toss 웹훅은 `PAYMENT_STATUS_CHANGED` 이벤트만 처리한다.

처리 순서:

1. 웹훅 payload에서 `orderId`, `paymentKey`를 추출한다.
2. `paymentKey`로 Toss 결제를 다시 조회한다.
3. Toss 조회 결과의 `orderId`, `paymentKey`, `totalAmount`가 내부 주문과 맞는지 검증한다.
4. 주문 row를 lock으로 잡고 상태별 보정 로직을 실행한다.

상태별 보정:

- `DONE`
  - `PENDING` 주문이면 `COMPLETED`로 전환한다.
  - 충전 원장이 없으면 wallet을 lock으로 잡고 코인을 충전한 뒤 `CHARGE` 원장을 생성한다.
  - 이미 충전 원장이 있으면 중복 충전하지 않는다.
- `CANCELED`
  - `COMPLETED` 주문이면 wallet을 lock으로 잡고 코인을 차감한 뒤 `REFUND` 원장을 생성한다.
  - 이미 환불 원장이 있으면 중복 차감하지 않는다.
  - `PENDING` 또는 `FAILED` 주문이면 주문만 `CANCELLED`로 전환한다.
- `ABORTED`, `EXPIRED`
  - `PENDING` 주문이면 `FAILED`로 전환한다.

방어 규칙:

- 주문에 이미 기록된 `paymentKey`와 다른 웹훅은 무시한다.
- Toss 조회 결과가 웹훅 payload와 다르면 무시한다.
- Toss 조회가 4xx로 실패하면 무시한다.
- 알 수 없는 상태는 주문/지갑을 변경하지 않는다.

## 채팅 결제 원장

채팅 결제는 요청자가 작가에게 코인을 지급하는 내부 지갑 이동이다.

처리 규칙:

- 채팅방 row를 lock으로 잡고 `ACCEPTED` 상태에서만 결제한다.
- 요청자 wallet을 lock으로 잡고 잔액 부족 여부를 확인한다.
- 작가 wallet을 lock으로 잡고 없으면 생성한다.
- 같은 트랜잭션 안에서 요청자 잔액 차감, 작가 잔액 증가, `payment_history`, 지갑 원장 2건을 저장한다.
- 원장 타입은 요청자 `USE`, 작가 `EARN`이다.
- source는 둘 다 `CHAT_PAYMENT`, sourceId는 `chat_room.id`다.

## 환전 원장

환전은 코인을 현금으로 전환하는 운영 프로세스다.

처리 규칙:

- 환전 신청 시 wallet을 lock으로 잡고 코인을 먼저 차감한다.
- 환전 신청 원장은 `WITHDRAW_REQUEST`, coinAmount는 음수다.
- 관리자 반려 시 wallet을 lock으로 잡고 코인을 복구한다.
- 반려 복구 원장은 `WITHDRAW_CANCEL`, coinAmount는 양수다.
- 관리자 완료 시 잔액 변동 없이 `WITHDRAW_COMPLETE` 원장을 남긴다.

## 중복 방어

`wallet_transaction`에는 아래 unique index를 사용한다.

```text
IDX_wallet_transaction_source_dedup
  member_id, type, source_type, source_id
```

이 인덱스는 같은 원천에서 같은 회원에게 같은 타입의 원장이 두 번 생성되는 것을 막는다.

예시:

- 같은 `COIN_ORDER`에서 `CHARGE`가 두 번 생성되면 차단된다.
- 같은 `COIN_ORDER`에서 `CHARGE`와 `REFUND`는 서로 다른 타입이라 허용된다.
- 같은 `CHAT_PAYMENT`에서 요청자 `USE`와 작가 `EARN`은 회원과 타입이 달라 허용된다.
- 같은 `WITHDRAW_REQUEST`에서 `WITHDRAW_REQUEST`, `WITHDRAW_CANCEL`, `WITHDRAW_COMPLETE`는 타입이 달라 허용된다.

## 관리자 감사 API

### 지갑 잔액/거래원장 불일치 점검

```http
GET /api/wallet/v1/admin/audit/balance-mismatches
```

확인하는 것:

- `wallet.balance`
- 완료된 `wallet_transaction.coinAmount` 합계
- 두 값의 차이

사용 시점:

- 배포 전 데이터 점검
- 웹훅/결제 장애 이후 정합성 점검
- 환전/채팅 결제 장애 이후 정합성 점검

### 거래원장 원천 중복 점검

```http
GET /api/wallet/v1/admin/audit/duplicate-transaction-sources
```

확인하는 것:

- `memberId + type + sourceType + sourceId` 조합이 중복된 원장 묶음
- 중복 건수
- 코인 합계
- 최초/최근 생성 시각

사용 시점:

- `IDX_wallet_transaction_source_dedup` migration 적용 전
- 중복 웹훅 또는 중복 API 호출 의심 시
- 지갑 잔액 불일치가 발견됐을 때 원인 추적

## Migration 적용 전 체크리스트

`wallet_transaction` unique index migration 적용 전에는 아래 순서로 확인한다.

1. 운영 DB 백업 또는 스냅샷을 확인한다.
2. `GET /api/wallet/v1/admin/audit/duplicate-transaction-sources` 결과가 비어 있는지 확인한다.
3. 중복 원장이 있으면 migration을 먼저 적용하지 않는다.
4. 중복 원장의 원천 API, source, 생성 시각, coinAmount를 확인해 보정 방식을 결정한다.
5. `GET /api/wallet/v1/admin/audit/balance-mismatches` 결과가 비어 있는지 확인한다.
6. 불일치가 있으면 원장 합계와 실제 잔액 중 어느 쪽을 기준으로 복구할지 결정한다.
7. 중복/불일치가 없거나 보정이 끝난 뒤 migration을 실행한다.

## 아직 남은 개선

- 결제 승인 API와 Toss 웹훅 보정 경로의 원장 생성 로직 공통화
- Toss 결제 승인/취소 API에 idempotency key 적용 검토
- Toss 웹훅 서명 검증 또는 이벤트 신뢰도 강화 검토
- 지갑 잔액 불일치 복구 API 설계
- 채팅 결제의 `payment_history`와 지갑 원장 불일치 점검 API 추가
- 환전 신청 상태와 지갑 원장 불일치 점검 API 추가
