# 마이/설정 화면 구현 점검 및 개발안

## 2026-04-06 최신 구현 현황

아래 내용이 현재 코드 기준 최신 상태다.  
이후 문단 중 일부는 초기 점검 시점 기준이라 현재 상태와 차이가 있을 수 있다.

### 현재 구현 완료

- 프로필 조회/수정
  - 닉네임 길이/형식 검증
  - 해시태그 개수/길이/형식 검증
  - 프로필 이미지 형식 검증
  - 닉네임 중복 확인 응답 개선
- 설정
  - 설정 홈 요약 API
  - 알림 설정 조회/수정 API
  - 앱 정보 조회 API
  - 앱 정보 관리자 수정 API
- 약관
  - 사용자 약관 목록 조회 API
  - 관리자 약관 목록/상세 조회 API
  - 관리자 약관 등록/수정/삭제 API
- 공지사항
  - 사용자 목록/상세 조회 API
  - 관리자 목록 조회 API
  - 관리자 등록/수정/삭제 API
- 1:1 문의
  - 사용자 문의 등록/목록/상세 API
  - 문의 이미지 업로드 지원
  - 관리자 목록/상세 조회 API
  - 관리자 상태 변경/답변 API
- 코인 지갑/코인샵
  - 지갑 조회 API
  - 거래내역 조회 API
  - 코인 상품 사용자 목록 조회 API
  - 관리자 코인 상품 목록/상세/등록/수정 API
  - 코인 주문 생성/목록/상세 API
  - 관리자 코인 주문 목록/상세 API
  - 토스 결제 승인/취소/웹훅 처리
- 환전계좌
  - 은행 목록 조회 API
  - 사용자 환전계좌 등록/목록/대표계좌 변경/삭제 API
  - 관리자 환전계좌 목록/상세 조회 API
  - 관리자 환전계좌 인증 API
- 환전
  - 환전 정책 조회 API
  - 사용자 환전 신청/목록/상세 API
  - 관리자 환전 요청 목록/상세 조회 API
  - 관리자 환전 승인/반려/완료 API
- 운영 초기화
  - 기본 코인 상품 시드
  - 조건부 약관 시드
- 문서
  - `README.md` 운영 가이드 정리
  - `.env.example` 추가

### 현재 미구현 또는 최소 잔여 작업

- 로그아웃 고도화
  - 서버 단 refresh token/blacklist 정책 없음
- 토스 운영 로그/재시도 정책 고도화
  - 현재 핵심 승인/취소/웹훅은 있으나 운영 로깅/감사 추적은 약함
- DB 마이그레이션 정리
  - 현재는 `synchronize` 기반
- 프론트 연동 후 세부 응답 미세 조정
  - 관리자 화면에서 필요한 컬럼 추가 여부는 실제 사용 후 판단 가능

### 지금 기준 권장 마감 판단

- 기능 구현은 핵심 범위 기준으로 거의 완료
- 지금부터는 신규 기능 추가보다
  - 커밋 정리
  - DB 반영 확인
  - 프론트 연동 확인
  - 운영 환경변수 정리
    순서로 마감하는 편이 좋다

## 기준

- 본 문서는 현재 백엔드 구현 상태를 기준으로 작성했다.
- 아래 3가지는 현재 방향으로 확정한다.
  - 개발 우선순위: 설정 영역 먼저
  - 1차 결제수단: 토스 우선
  - 환전 처리 방식: 관리자 승인형
- 점검 근거 파일
  - `src/member/member.controller.ts`
  - `src/member/member.service.ts`
  - `src/email/email.controller.ts`
  - `src/chat/chat.controller.ts`
  - `src/chat/chat.service.ts`
  - `src/entities/payment-history.entity.ts`
  - `src/entities/refund-history.entity.ts`
  - `src/entities/notification.entity.ts`
  - `src/entities/inquiry.entity.ts`
  - `src/entities/notice.entity.ts`
  - `src/entities/terms.entity.ts`

## 한눈에 보는 현재 상태

| 화면/기능                               | 현재 상태 | 비고                                                                   |
| --------------------------------------- | --------- | ---------------------------------------------------------------------- |
| 마이 > 프로필 조회                      | 부분 구현 | `GET /member/v1/me` 존재                                               |
| 프로필 수정                             | 부분 구현 | `PATCH /member/v1/profile` 존재, 상세 검증 부족                        |
| 프로필 이미지 업로드                    | 부분 구현 | 파일 크기 5MB 제한만 존재, 형식 검증 없음                              |
| 닉네임 중복 확인                        | 부분 구현 | `GET /member/check-nickname` 존재, 수정 API와 원자적으로 연결되지 않음 |
| 비밀번호 변경                           | 구현      | `PATCH /auth/email/v1/password/update` 존재                            |
| 회원탈퇴                                | 구현      | `DELETE /member/v1/withdraw` 존재                                      |
| 로그아웃                                | 구현      | `POST /auth/logout` 존재, 현재는 프론트에서 access token 삭제 방식     |
| 알림 설정                               | 미구현    | 알림 테스트용 FCM 전송만 존재                                          |
| 공지사항                                | 미구현    | 엔티티만 있고 API/서비스/모듈 없음                                     |
| 고객센터 / 1:1 문의                     | 미구현    | 엔티티만 있고 API/서비스/모듈 없음                                     |
| 앱 관리                                 | 미구현    | 버전/약관/정책/앱 메타 API 없음                                        |
| 내 그리코인 잔액                        | 미구현    | 회원 보유 코인 개념 없음                                               |
| 코인샵 / 무료코인 / 구매내역 / 거래내역 | 미구현    | 채팅 결제 이력 일부만 존재                                             |
| 그리코인 결제                           | 미구현    | 채팅 결제만 존재, 코인 상품 결제 없음                                  |
| 보유코인 환전하기                       | 미구현    | 환전 신청 API/상태 관리 없음                                           |
| 환전계좌 관리                           | 미구현    | 계좌 엔티티/API 없음                                                   |
| 환전계좌 등록                           | 미구현    | 은행 선택/계좌 검증/약관 동의/1원 인증 흐름 없음                       |

## 화면별 점검

### 1. 마이/설정 메인

#### 현재 구현됨

- 내 프로필 기본 조회 API 존재
- 비밀번호 변경 API 존재
- 회원탈퇴 API 존재
- 로그아웃 API 존재
- 비활성/탈퇴 회원의 일반 로그인, 소셜 로그인, JWT 인증 차단

#### 구현 미비

- 설정 메인 화면에서 필요한 항목 대부분을 뒷받침하는 API가 없다.
  - 알림 설정
  - 공지 사항
  - 고객 센터
  - 1:1 문의
  - 앱 관리
  - 환전계좌 관리/등록
- `notification` 엔티티는 있으나 목록 조회, 읽음 처리, 환경설정과 연결된 로직이 없다.
- FCM은 테스트 발송 엔드포인트만 있고, 실제 사용자 디바이스 토큰 관리도 없다.

#### 개발안

- 설정 홈 API를 별도 제공
  - `GET /settings/v1/summary`
  - 응답 예시: 프로필 요약, 코인 잔액, 알림 설정 여부, 환전계좌 등록 여부, 앱 버전 정보
- 알림 설정용 도메인 추가
  - `notification_preference` 테이블
  - 항목 예시: 전체 알림, 채팅 알림, 결제 알림, 마케팅 알림
- 로그아웃 정책 정의
  - 현재는 Access Token만 사용하는 구조라 프론트 단 로그아웃으로 동작
  - Refresh Token 도입 예정이면 서버 블랙리스트/토큰 테이블 필요
- 앱 관리용 메타 API 추가
  - `GET /settings/v1/app-info`
  - 앱 버전, 최신 버전 여부, 이용약관/개인정보처리방침 링크, 오픈소스/사업자 정보 등

#### 우선순위

- 상

### 2. 프로필 편집

#### 현재 구현됨

- `GET /member/v1/me`
- `PATCH /member/v1/profile`
- 이미지 업로드 가능
- 자기소개 30자 제한 존재
- 해시태그 배열 저장 가능

#### 구현 미비

- 이미지 업로드 검증이 디자인 요구사항 수준으로 세밀하지 않다.
  - 현재는 5MB 제한만 있음
  - MIME type, 확장자, 정사각형/권장 비율, 최소 해상도 등의 검증 없음
- 닉네임 검증이 부족하다.
  - 20자 이하 제한 없음
  - 특수문자 금지 규칙 없음
  - 중복 닉네임 저장 차단 없음
  - `check-nickname` 응답이 `true = 이미 존재` 형태라 프론트에서 의미 해석 주의 필요
- 해시태그 검증이 부족하다.
  - 5개 이하 제한 없음
  - 각 태그 10자 이하 제한 없음
  - 특수문자 금지 없음
  - `#` prefix 처리 기준 불명확
  - 공백 제거/정규화 규칙은 프론트 의존으로 남아 있음
- 성공/실패 메시지용 표준 응답 규격이 없다.

#### 개발안

- DTO 검증 강화
  - 닉네임: `@MaxLength(20)` + 정규식 적용
  - 자기소개: 현재 30자 유지
  - 해시태그: 최대 5개, 각 태그 최대 10자, 허용 문자 정규식 적용
- 서비스 레벨 중복 방지 추가
  - 닉네임 변경 시 본인 제외 중복 체크
  - DB 유니크 인덱스도 함께 검토
- 해시태그 정규화 규칙 명문화
  - 입력 예: `#귀여운`, `귀여운`, `#귀여운`
  - 저장 규칙: `#` 제거 후 소문자/trim 저장 또는 표시용 원문 유지 중 하나로 통일
- 프로필 이미지 검증 추가
  - 허용 형식: jpg, jpeg, png, webp
  - 파일 크기 제한 유지 또는 확정
  - 필요 시 업로드 전 압축/리사이즈 정책 수립

#### 권장 API 보완

- `PATCH /member/v1/profile`
  - 실패 사유를 필드 단위로 명확히 반환
- `GET /member/check-nickname`
  - 응답을 `{ available: boolean }` 형태로 변경 권장

#### 우선순위

- 상

### 3. 공지사항 / 고객센터 / 1:1 문의

#### 현재 구현됨

- `notice`, `inquiry`, `inquiry_image`, `terms` 엔티티는 존재

#### 구현 미비

- 모듈/서비스/컨트롤러가 없다.
- 사용자용 API가 전혀 없다.
- 관리자 작성/답변 API도 없다.
- 문의 첨부 이미지 업로드 처리도 없다.
- 문의 상태 변경 이력, 답변자, 답변 시간 노출 정책이 없다.

#### 개발안

- 공지사항 모듈 추가
  - `GET /notice/v1`
  - `GET /notice/v1/:id`
  - 관리자용 `POST/PATCH/DELETE`
- 1:1 문의 모듈 추가
  - `POST /inquiry/v1`
  - `GET /inquiry/v1/me`
  - `GET /inquiry/v1/:id`
  - 관리자용 답변 API
- 문의 이미지 업로드 처리
  - S3 업로드
  - 최대 첨부 수/허용 형식 제한
- 앱 관리 화면에서 필요한 약관/버전/고객센터 링크 API 추가

#### 우선순위

- 중

### 4. 코인상점 / 내 그리코인 / 구매내역 / 거래내역

#### 현재 구현됨

- 채팅방 결제 시 `payment_history` 생성
- 결제수단 enum 존재
  - `KAKAO_PAY`
  - `NAVER_PAY`
  - `CREDIT_CARD`
  - `TOSS_PAY`

#### 구현 미비

- 현재 `payment_history`는 채팅 결제 중심이다.
  - `chatRoomId` 기준으로 저장
  - 코인 상품 구매 이력 구조가 아님
- 회원 코인 잔액을 보관하는 모델이 없다.
- 코인 상품(10개, 20개, 30개 등) 모델이 없다.
- 무료코인 지급 로직이 없다.
- 구매내역/거래내역 조회 API가 없다.
- 거래 유형이 너무 제한적이다.
  - 충전
  - 사용
  - 지급
  - 환전 차감
  - 환전 완료/실패 롤백
- 디자인에 있는 결제수단과 enum이 불일치한다.
  - 디자인: 간편결제, 계좌결제, 토스, 네이버페이, 페이코, 카카오페이
  - 현재 enum: 페이코 없음, 계좌이체 없음

#### 개발안

- 코인 원장 구조로 재설계 권장
  - `wallet`
  - `wallet_transaction`
  - `coin_product`
  - `coin_order`
- 추천 모델
  - `wallet`
    - `member_id`
    - `balance`
  - `wallet_transaction`
    - `member_id`
    - `type` (`CHARGE`, `USE`, `EARN`, `WITHDRAW_REQUEST`, `WITHDRAW_CANCEL`, `WITHDRAW_COMPLETE`)
    - `coin_amount`
    - `cash_amount`
    - `status`
    - `source_type`
    - `source_id`
  - `coin_product`
    - 상품명, 코인 수량, 판매가, 활성 여부
  - `coin_order`
    - 주문번호, 상품ID, 결제수단, PG 거래번호, 상태
- API 제안
  - `GET /wallet/v1/me`
  - `GET /wallet/v1/transactions`
  - `GET /coin-shop/v1/products`
  - `POST /coin-shop/v1/orders`
  - `POST /coin-shop/v1/orders/:id/pay`
  - `GET /coin-shop/v1/orders`
- 무료코인 정책 필요
  - 가입 축하
  - 이벤트 지급
  - 광고 참여 보상
  - 운영자 수동 지급

#### 우선순위

- 상

### 5. 그리코인 결제

#### 현재 구현됨

- 채팅방 단건 결제 API만 존재
  - `PATCH /chat/:id/pay`

#### 구현 미비

- 디자인의 코인 충전 결제 플로우를 뒷받침하지 못한다.
  - 계좌결제/간편결제 분기 없음
  - PG사별 결제창 연동 없음
  - 주문 생성/검증/승인/실패 처리 없음
  - 결제 완료 후 코인 적립 로직 없음
- 결제 완료 화면용 주문 상태 조회 API 없음
- 서버가 외부 PG webhook/callback을 받아 상태를 동기화하는 구조가 없다.

#### 개발안

- PG 연동 전제 설계
  - 프론트 결제 진입용 주문 생성
  - 결제 승인 콜백/webhook 처리
  - 중복 승인 방지 idempotency 처리
- API 제안
  - `POST /payments/v1/coin-orders`
  - `POST /payments/v1/coin-orders/:id/confirm`
  - `POST /payments/v1/webhooks/{pg}`
  - `GET /payments/v1/coin-orders/:id`
- 결제수단 enum 재정의
  - `KAKAO_PAY`, `NAVER_PAY`, `PAYCO`, `TOSS_PAY`, `BANK_TRANSFER`, `CARD`

#### 우선순위

- 상

### 6. 보유코인 환전하기

#### 현재 구현됨

- `refund_history` 엔티티만 존재

#### 구현 미비

- 환전 신청의 주체가 되는 코인 잔액 모델이 없다.
- 환전 가능 금액 계산 로직이 없다.
- 환전 요청 상태가 없다.
- 환전 계좌 선택 기능이 없다.
- 최소 환전 단위, 수수료, 일일 한도, 보류/반려 사유 규칙이 없다.
- 환전 완료/실패 시 잔액 차감/복구 처리 구조가 없다.
- 알림 발송 로직과 연결되지 않는다.

#### 개발안

- `refund_history`만으로는 부족하므로 별도 환전 요청 테이블 권장
  - `withdraw_request`
    - `member_id`
    - `withdraw_account_id`
    - `coin_amount`
    - `cash_amount`
    - `fee_amount`
    - `status` (`REQUESTED`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED`)
    - `reason`
    - `requested_at`, `processed_at`
- 환전 신청 시 처리 규칙
  - 신청 즉시 잔액 홀드 또는 차감
  - 실패 시 롤백 트랜잭션
  - 거래내역 자동 기록
- API 제안
  - `POST /withdraw/v1/requests`
  - `GET /withdraw/v1/requests/me`
  - `GET /withdraw/v1/requests/:id`

#### 우선순위

- 상

### 7. 환전계좌 관리

#### 현재 구현됨

- 없음

#### 구현 미비

- 계좌 엔티티 자체가 없다.
- 대표 계좌 지정 기능이 없다.
- 삭제 기능이 없다.
- 빈 상태 화면을 위한 등록 여부 조회 API도 없다.

#### 개발안

- 신규 테이블 제안: `withdraw_account`
  - `member_id`
  - `bank_code`
  - `bank_name`
  - `account_holder`
  - `account_number_masked`
  - `account_number_encrypted`
  - `is_primary`
  - `status`
  - `verified_at`
- API 제안
  - `GET /withdraw-accounts/v1`
  - `POST /withdraw-accounts/v1`
  - `PATCH /withdraw-accounts/v1/:id/primary`
  - `DELETE /withdraw-accounts/v1/:id`
- 보안 요구사항
  - 평문 계좌번호 저장 금지
  - 암호화 저장
  - 응답 시 마스킹
  - 감사 로그 필요

#### 우선순위

- 상

### 8. 환전계좌 등록

#### 현재 구현됨

- 없음

#### 구현 미비

- 은행 목록 제공 API 없음
- 예금주/계좌번호 검증 없음
- 약관 동의 이력 저장 구조 없음
- 1원 인증 또는 실계좌 인증 로직 없음
- 등록 완료/실패 상태 관리 없음

#### 개발안

- 3단계 플로우 기준 설계
  - 1단계: 은행 선택 + 계좌번호 입력
  - 2단계: 약관 동의
  - 3단계: 인증번호 입력
- 추가 테이블 제안
  - `withdraw_account_verification`
    - `member_id`
    - `bank_code`
    - `account_number_encrypted`
    - `verification_code`
    - `status`
    - `expires_at`
  - `member_terms_agreement`
    - `member_id`
    - `terms_id`
    - `agreed_at`
- API 제안
  - `GET /banks/v1`
  - `POST /withdraw-accounts/v1/verify/request`
  - `POST /withdraw-accounts/v1/verify/confirm`
  - `GET /terms/v1?type=withdraw-account`
- 외부 연동 필요사항
  - 오픈뱅킹 또는 펌뱅킹 기반 실계좌 검증
  - 미도입 시 초기에는 소액 인증 또는 관리자 수동 승인으로 대체 가능

#### 우선순위

- 상

## 공통 개선 포인트

### 1. 모듈 분리

- 현재 `member`, `email`, `chat` 중심 구조로는 설정 영역 확장이 어렵다.
- 아래 모듈 분리를 권장한다.
  - `settings`
  - `notice`
  - `inquiry`
  - `wallet`
  - `payment`
  - `withdraw`
  - `notification`

### 2. 상태값 표준화

- 결제, 거래, 환전은 모두 상태 기반 도메인이다.
- enum을 기능별로 분리하고, 화면 표시용 한글 상태 매핑은 응답 DTO 또는 프론트에서 처리한다.

### 3. 트랜잭션 처리

- 코인 충전, 차감, 환전 신청, 환전 취소/실패는 반드시 DB 트랜잭션으로 묶어야 한다.
- 원장(`wallet_transaction`)은 append-only 방식 권장

### 4. 감사 로그 / 운영도구

- 환전 승인/반려, 공지 등록, 문의 답변은 관리자 기능이 필요하다.
- 관리자 백오피스 또는 최소한의 어드민 API 범위를 같이 정의해야 한다.

### 5. 보안

- 계좌번호 암호화 저장
- 결제 webhook 서명 검증
- 닉네임 유니크 인덱스 검토
- 업로드 파일 형식 검증 강화

## 추천 개발 순서

### 1차

- 프로필 수정 검증 강화
- 설정 홈 요약 API
- 알림 설정 테이블/API
- 로그아웃 정책 확정

### 2차

- 공지사항 API
- 1:1 문의 API
- 앱 관리/약관/버전 API

### 3차

- 지갑(`wallet`) 및 거래원장(`wallet_transaction`) 도입
- 코인 상품/주문/결제 플로우 구현
- 구매내역/거래내역 조회 API

### 4차

- 환전계좌 등록/관리
- 환전 신청/상태관리
- 운영자 승인 플로우

## 단계별 제안

### 0단계. 기준 정리 및 선행 결정

#### 목표

- 뒤 단계에서 다시 갈아엎지 않도록 정책을 먼저 확정한다.

#### 이번 단계에서 확정할 것

- 코인 정책
  - 1코인당 원화 기준
  - 최소 충전 단위
  - 무료코인 지급 조건
  - 환전 가능 최소 단위
  - 환전 수수료
- 결제 정책
  - 우선 도입 PG
  - 지원 결제수단 범위
  - 주문 취소/실패 시 처리 방식
- 환전 정책
  - 자동 승인 여부
  - 관리자 승인 프로세스
  - 정산 주기
- 계좌 정책
  - 실계좌 인증 방식
  - 초기 수동 승인 허용 여부
- 인증 정책
  - 로그아웃을 서버에서 관리할지
  - Refresh Token 도입 여부

#### 산출물

- 기능 정책 문서 1개
- enum/상태 정의 초안
- 외부 연동 필요 목록

#### 권장 기간

- 반나절 ~ 1일

### 1단계. 빠르게 붙일 수 있는 설정 영역 완성

#### 목표

- 현재 있는 회원 기능을 디자인 수준에 맞게 다듬고, 설정 홈에서 필요한 최소 API를 만든다.

#### 포함 기능

- 프로필 수정 검증 강화
  - 닉네임 20자 제한
  - 특수문자 금지
  - 닉네임 중복 방지
  - 해시태그 5개 제한
  - 해시태그 1개당 10자 제한
  - 프로필 이미지 형식 검증
- 닉네임 중복 확인 API 응답 개선
- 설정 홈 요약 API
  - 프로필 요약
  - 환전계좌 등록 여부
  - 알림 설정 여부
  - 코인 기능 준비 전까지는 코인 잔액 placeholder 가능
- 알림 설정 테이블/API
  - 전체 알림
  - 채팅 알림
  - 결제 알림
  - 마케팅 알림
- 로그아웃 정책 반영
  - 서버 무상태 유지 또는 토큰 폐기 구조 결정

#### 추천 API

- `GET /settings/v1/summary`
- `GET /settings/v1/notifications`
- `PATCH /settings/v1/notifications`
- 기존 `PATCH /member/v1/profile` 보강

#### 완료 기준

- 설정 메인과 프로필 편집 화면을 실데이터로 붙일 수 있음
- 프론트에서 검증 메시지를 안정적으로 노출할 수 있음

#### 권장 우선순위

- 최우선

### 2단계. 공지/문의/앱관리 구축

#### 목표

- 설정 화면의 정보성 메뉴를 실제 서비스 가능한 수준으로 만든다.

#### 포함 기능

- 공지사항 목록/상세 API
- 1:1 문의 등록/목록/상세 API
- 문의 이미지 첨부 업로드
- 약관/앱버전/고객센터 정보 API
- 관리자용 공지 등록/수정/삭제
- 관리자용 문의 답변 API

#### 추천 API

- `GET /notice/v1`
- `GET /notice/v1/:id`
- `POST /inquiry/v1`
- `GET /inquiry/v1/me`
- `GET /inquiry/v1/:id`
- `GET /settings/v1/app-info`
- `GET /terms/v1`

#### 완료 기준

- 설정 화면의 `공지 사항`, `고객 센터`, `1:1 문의`, `앱 관리` 연결 가능
- 운영자가 최소한의 응대 처리를 할 수 있음

#### 권장 우선순위

- 높음

### 3단계. 코인 지갑/거래원장 도입

#### 목표

- 이후 충전/사용/환전이 모두 안정적으로 쌓일 수 있는 코어 도메인을 먼저 만든다.

#### 포함 기능

- `wallet` 테이블 도입
- `wallet_transaction` 원장 도입
- `coin_product` 상품 테이블 도입
- `coin_order` 주문 테이블 도입
- 내 코인 잔액 조회 API
- 거래내역 조회 API
- 코인 상품 목록 API

#### 왜 먼저 이 단계가 필요한가

- 충전, 무료지급, 채팅 사용, 환전 차감이 모두 같은 잔액 체계를 써야 한다.
- 이 단계 없이 결제부터 붙이면 추후 정산/환불/환전에서 재작업 가능성이 크다.

#### 추천 API

- `GET /wallet/v1/me`
- `GET /wallet/v1/transactions`
- `GET /coin-shop/v1/products`
- `POST /coin-shop/v1/orders`

#### 완료 기준

- 회원별 코인 잔액이 DB에서 일관되게 관리됨
- 거래내역 화면의 기본 목록을 실제 데이터로 제공 가능

#### 권장 우선순위

- 최우선

### 4단계. 그리코인 충전/결제 플로우 구현

#### 목표

- 코인샵에서 실제 결제를 통해 코인을 충전할 수 있게 만든다.

#### 포함 기능

- PG 연동
- 코인 주문 생성
- 결제 승인/실패/취소 처리
- webhook/callback 처리
- 결제 완료 후 지갑 적립
- 구매내역 조회 API

#### 추천 접근

- 첫 릴리즈는 PG 1개만 우선 도입
  - 예: 토스 또는 카카오페이
- 성공 플로우 안정화 후 결제수단 확장

#### 추천 API

- `POST /payments/v1/coin-orders`
- `POST /payments/v1/coin-orders/:id/confirm`
- `POST /payments/v1/webhooks/{pg}`
- `GET /coin-shop/v1/orders`
- `GET /coin-shop/v1/orders/:id`

#### 완료 기준

- 디자인의 `그리코인 결제`와 `코인상점/구매내역` 일부 연결 가능
- 코인 충전 후 잔액과 거래내역이 즉시 반영됨

#### 권장 우선순위

- 최우선

### 5단계. 환전계좌 등록/관리

#### 목표

- 환전 전제조건인 계좌 등록을 안정적으로 구축한다.

#### 포함 기능

- 은행 목록 API
- 환전계좌 등록
- 대표 계좌 설정
- 계좌 삭제
- 계좌 인증 로직
- 약관 동의 이력 저장

#### 초기 구현 권장안

- 1차: 관리자 승인 또는 간단 인증 기반 등록
- 2차: 오픈뱅킹/펌뱅킹 실계좌 인증 고도화

#### 추천 API

- `GET /banks/v1`
- `GET /withdraw-accounts/v1`
- `POST /withdraw-accounts/v1`
- `PATCH /withdraw-accounts/v1/:id/primary`
- `DELETE /withdraw-accounts/v1/:id`
- `POST /withdraw-accounts/v1/verify/request`
- `POST /withdraw-accounts/v1/verify/confirm`

#### 완료 기준

- 설정 화면의 `환전계좌 관리`, `환전계좌 등록` 연결 가능
- 회원별 대표 계좌 1개를 기준으로 환전 신청 가능

#### 권장 우선순위

- 높음

### 6단계. 환전 신청/정산 플로우 구현

#### 목표

- 보유 코인을 실제 환전 요청으로 전환하고 운영자가 처리할 수 있게 만든다.

#### 포함 기능

- 환전 신청 API
- 환전 요청 상태 관리
- 환전 요청 시 잔액 홀드/차감
- 반려/실패 시 롤백
- 환전 내역 조회 API
- 관리자 승인/완료 처리 API
- 알림 연동

#### 추천 API

- `POST /withdraw/v1/requests`
- `GET /withdraw/v1/requests/me`
- `GET /withdraw/v1/requests/:id`
- 관리자용 승인/반려/완료 API

#### 완료 기준

- `보유코인 환전하기` 화면 연결 가능
- 신청부터 완료/반려까지 상태 추적 가능

#### 권장 우선순위

- 높음

## 실제 착수 순서 제안

### 안 A. 빠른 화면 연결 우선

1. 1단계
2. 2단계
3. 3단계
4. 4단계
5. 5단계
6. 6단계

#### 적합한 경우

- 프론트가 먼저 대부분의 메뉴를 연결해야 할 때
- 운영 기능 화면을 빨리 열어야 할 때

### 안 B. 코인/환전 핵심 도메인 우선

1. 0단계
2. 1단계
3. 3단계
4. 4단계
5. 5단계
6. 6단계
7. 2단계

#### 적합한 경우

- 비즈니스 핵심이 코인 충전/환전일 때
- 결제/정산 리스크를 먼저 줄이고 싶을 때

### 현재 저장소 기준 추천안

- 추천은 `안 B`다.
- 이유
  - 지금 공백이 가장 큰 부분이 코인/환전 도메인이다.
  - 공지/문의는 나중에 붙여도 구조적 재작업이 크지 않다.
  - 반면 코인/환전은 초기에 지갑/원장 구조를 잘못 잡으면 이후 변경 비용이 매우 크다.

## 이번 프로젝트 확정 방향

### 1. 개발 우선순위

- `설정 먼저`로 진행한다.
- 따라서 실제 착수 순서는 아래 기준으로 가져간다.
  1. 1단계. 빠르게 붙일 수 있는 설정 영역 완성
  2. 2단계. 공지/문의/앱관리 구축
  3. 3단계. 코인 지갑/거래원장 도입
  4. 4단계. 그리코인 충전/결제 플로우 구현
  5. 5단계. 환전계좌 등록/관리
  6. 6단계. 환전 신청/정산 플로우 구현

### 2. 1차 결제수단

- `토스`를 1차 결제수단으로 확정한다.
- 초기 구현 범위
  - 코인 주문 생성
  - 토스 결제 승인
  - 승인 성공 시 코인 적립
  - 실패/취소 처리
  - webhook 또는 승인 검증 처리
- 나머지 결제수단은 2차 확장 대상으로 둔다.

### 3. 환전 처리 방식

- `관리자 승인형`으로 시작한다.
- 초기 운영 흐름
  - 회원이 환전 신청
  - 시스템이 신청 상태로 보관
  - 관리자가 계좌/금액 확인 후 승인 또는 반려
  - 승인 완료 시 환전 완료 처리
- 따라서 초기 환전 기능은 자동 정산보다 아래 항목이 더 중요하다.
  - 환전 요청 상태값
  - 관리자 처리 API
  - 반려 사유 저장
  - 환전 이력 조회

## 확정 방향 기준 다음 액션

### 바로 시작할 1차 범위

- 프로필 수정 검증 강화
- 설정 홈 요약 API
- 알림 설정 API
- 공지사항 목록/상세 API
- 1:1 문의 등록/목록 API
- 앱 관리 API

### 그 다음 범위

- 토스 기준 코인 주문/결제 구조 설계
- 지갑 및 거래원장 도입
- 환전계좌 관리
- 관리자 승인형 환전 플로우

## 1차 범위 상세 작업목록

### 목표

- `마이/설정` 화면에서 코인/환전을 제외한 기본 메뉴를 실제 데이터 기반으로 연결 가능하게 만든다.
- 프론트가 임시 데이터 없이 붙을 수 있도록 설정 관련 API를 우선 정리한다.

### 1-1. 프로필 수정 검증 강화

#### 작업 내용

- `UpdateProfileDto` 검증 보강
  - 닉네임 최대 20자
  - 닉네임 허용 문자 정규식 적용
  - 자기소개 30자 유지
  - 해시태그 최대 5개
  - 해시태그 각 10자 제한
  - 해시태그 허용 문자 정규식 적용
- `MemberService.updateProfile` 보강
  - 닉네임 변경 시 본인 제외 중복 검사
  - 중복 시 명확한 에러 반환
  - 해시태그 정규화 후 저장
- 프로필 이미지 업로드 검증 보강
  - 허용 MIME type 제한
  - 허용 확장자 제한

#### 수정 대상

- `src/member/dto/update-profile.dto.ts`
- `src/member/member.service.ts`
- `src/member/member.controller.ts`
- 필요 시 프로필 업로드 DTO도 동일 규칙 반영

#### 권장 세부 규칙

- 닉네임
  - 한글, 영문, 숫자만 허용
  - 공백/특수문자 금지
  - 길이 2~20자 권장
- 해시태그
  - 입력 시 `#` 포함 허용
  - 저장 전 `#` 제거 + trim
  - 빈 문자열 제거
  - 중복 제거

#### 완료 기준

- 프로필 수정 화면의 에러 상태를 서버 응답으로 모두 제어 가능
- 동일 닉네임 중복 저장이 방지됨

### 1-2. 닉네임 중복 확인 API 응답 개선

#### 작업 내용

- 현재 boolean 반환 방식을 명시적 구조로 변경
- 권장 응답
  - `{ available: boolean }`
  - 필요 시 `{ available: false, reason: 'DUPLICATED' }`

#### 수정 대상

- `src/member/member.controller.ts`
- `src/member/member.service.ts`
- DTO 추가 가능

#### 완료 기준

- 프론트에서 `true/false` 의미를 뒤집어 해석할 위험이 없어짐

### 1-3. 설정 홈 요약 API 추가

#### 작업 내용

- 설정 화면 상단에 필요한 최소 정보 제공 API 추가
- 응답 항목 예시
  - 닉네임
  - 프로필 이미지 URL
  - 해시태그
  - 코인 잔액 placeholder 또는 `null`
  - 환전계좌 등록 여부
  - 알림 설정 여부

#### 권장 API

- `GET /settings/v1/summary`

#### 응답 예시

```json
{
  "nickname": "홍길동",
  "profileImageUrl": "https://...",
  "hashTags": ["귀여운", "낚시"],
  "coinBalance": null,
  "hasWithdrawAccount": false,
  "notificationEnabled": true
}
```

#### 신규 구성 권장

- `settings` 모듈 추가
- `settings.controller.ts`
- `settings.service.ts`
- 설정 전용 response DTO

#### 완료 기준

- 설정 메인 화면 상단 카드와 메뉴 상태값을 단일 API로 표시 가능

### 1-4. 알림 설정 API 추가

#### 작업 내용

- 사용자별 알림 수신 설정 저장 구조 추가
- 권장 테이블: `notification_preference`
  - `member_id`
  - `all_enabled`
  - `chat_enabled`
  - `payment_enabled`
  - `marketing_enabled`
- 조회/수정 API 추가

#### 권장 API

- `GET /settings/v1/notifications`
- `PATCH /settings/v1/notifications`

#### 응답 예시

```json
{
  "allEnabled": true,
  "chatEnabled": true,
  "paymentEnabled": true,
  "marketingEnabled": false
}
```

#### 수정 대상

- 신규 엔티티
- `settings` 모듈
- 필요 시 `member`와 relation 추가

#### 완료 기준

- `알림 설정` 화면에서 토글 상태를 서버와 동기화 가능

### 1-5. 공지사항 목록/상세 API 추가

#### 작업 내용

- 기존 `notice` 엔티티 기반 사용자용 조회 API 추가
- 최신순 목록 조회
- 상세 조회

#### 권장 API

- `GET /notice/v1`
- `GET /notice/v1/:id`

#### 권장 응답 항목

- `id`
- `title`
- `content`
- `createdAt`

#### 신규 구성 권장

- `notice` 모듈
- `notice.controller.ts`
- `notice.service.ts`
- 목록/상세 response DTO

#### 완료 기준

- 설정 화면의 `공지 사항` 연결 가능

### 1-6. 1:1 문의 등록/목록 API 추가

#### 작업 내용

- 기존 `inquiry` 엔티티 기반 사용자용 API 추가
- 문의 등록
- 내 문의 목록
- 문의 상세
- 초기 단계에서는 이미지 첨부를 선택사항으로 두고, 먼저 텍스트 문의만 오픈해도 됨

#### 권장 API

- `POST /inquiry/v1`
- `GET /inquiry/v1/me`
- `GET /inquiry/v1/:id`

#### 권장 등록 항목

- `category`
- `title`
- `content`

#### 1차 범위 권장 상태값

- 등록 시 `PENDING`
- 관리자 확인 후 `IN_PROGRESS`
- 답변 완료 시 `ANSWERED`

#### 신규 구성 권장

- `inquiry` 모듈
- `inquiry.controller.ts`
- `inquiry.service.ts`
- 생성/목록/상세 DTO

#### 완료 기준

- 설정 화면의 `1:1 문의` 진입 및 문의 내역 조회 가능

### 1-7. 앱 관리 API 추가

#### 작업 내용

- 앱 버전/약관/정책/고객센터 정보 응답 API 추가
- 현재 `terms` 엔티티와 연결 가능하도록 설계

#### 권장 API

- `GET /settings/v1/app-info`
- `GET /terms/v1`

#### 응답 항목 예시

- 현재 앱 버전
- 최소 지원 버전
- 최신 버전 여부
- 이용약관 목록
- 개인정보처리방침 링크
- 고객센터 메일/운영시간

#### 완료 기준

- 설정 화면의 `앱 관리`, `고객 센터` 메뉴 연결 가능

### 1차 구현 순서 제안

1. 프로필 수정 검증 강화
2. 닉네임 중복 확인 응답 개선
3. `settings` 모듈 생성
4. 설정 홈 요약 API
5. 알림 설정 엔티티/API
6. `notice` 모듈 생성 및 목록/상세 API
7. `inquiry` 모듈 생성 및 등록/목록/상세 API
8. 앱 관리/약관 API

### 1차 완료 기준

- 프론트에서 아래 메뉴를 더미 데이터 없이 연결 가능
  - 프로필 편집
  - 알림 설정
  - 공지 사항
  - 고객 센터
  - 1:1 문의
  - 앱 관리
- 설정 메인 화면은 `GET /settings/v1/summary`로 기본 상태를 렌더링 가능

### 1차 이후 바로 넘어갈 작업

- 코인 지갑 테이블 설계
- 거래원장 설계
- 토스 결제 주문/승인 플로우 설계

## 최종 판단

- 디자인에 나온 `마이/설정` 범위 중 현재 바로 연결 가능한 백엔드 기능은 `프로필 조회/수정`, `비밀번호 변경`, `회원탈퇴`, `채팅 결제 일부` 정도다.
- 특히 `코인`, `환전`, `환전계좌`, `공지/문의`, `알림 설정`은 화면 대비 백엔드 구현 공백이 크다.
- 따라서 이번 영역은 단순 화면 연결 작업이 아니라, 설정/지갑/결제/환전 도메인을 분리해서 단계적으로 구축하는 방식으로 가는 것이 안전하다.
