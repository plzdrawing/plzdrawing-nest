# 그림 요청 채팅 API 구현 계획서

## 구현 현황 요약

| 구분         | 내용                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| ✅ 구현 완료 | 채팅방 CRUD, 메시지 송수신, 이미지 업로드, 읽음 처리, 요청 카드 자동 생성 |
| 🔧 수정 필요 | `PATCH /chats/:id/status` — 권한 체크 없음, Admin 전용으로 제한 필요      |
| ❌ 미구현    | 수락/거절/결제/취소/작업시작/그림전송/수정요청/확인/금액수정/후기 API     |
| ✅ 구현 완료 | 메시지 1000자 제한 (`SendMessageDto.content` MaxLength 1000)              |
| ❌ 미구현    | `ChatRoomStatus.ACCEPTED`, `DRAFT_SENT` enum 값                           |
| ✅ 구현 완료 | `ChatRoom` 엔티티 컬럼 — `estimatedAt`, `feedbackCount`, `feedbackUsed`   |

---

## 현황 분석

### 기존 구현된 API

> ✅ = 구현 완료 / 🔧 = 수정 필요 / ❌ = 미구현

| 상태 | 메서드 | 경로                             | 설명                                                    |
| ---- | ------ | -------------------------------- | ------------------------------------------------------- |
| ✅   | POST   | /chats                           | 채팅방 생성 + REQUEST_CARD 시스템 메시지 자동 생성      |
| ✅   | GET    | /chats                           | 채팅방 목록 조회 (status/unreadOnly/page/limit 필터)    |
| ✅   | GET    | /chats/:id                       | 채팅방 상세 조회 (게시글/참여자/금액/상태 포함)         |
| 🔧   | PATCH  | /chats/:id/status                | 상태 변경 — 권한 체크 없음, 전용 API로 대체 예정        |
| ✅   | GET    | /chats/:id/messages              | 메시지 목록 (beforeId/afterId 커서 페이징)              |
| ✅   | POST   | /chats/:id/messages              | TEXT/IMAGE 메시지 전송 (레퍼런스 파일/사진 포함)        |
| ✅   | POST   | /chats/:id/messages/image-upload | S3 presigned upload URL 발급                            |
| ✅   | PATCH  | /chats/:id/read                  | 읽음 처리 (lastReadMessageId 기준)                      |
| ❌   | PATCH  | /chats/:id/request               | 요청자 요청 내용 수정 (REQUESTED 상태에서만)            |
| ❌   | PATCH  | /chats/:id/accept                | 그림쟁이 수락 + 결제 요청서 (수정 횟수 포함)            |
| ❌   | PATCH  | /chats/:id/reject                | 그림쟁이 거절 (사유 키워드 + 자유 입력)                 |
| ❌   | PATCH  | /chats/:id/cancel                | 요청자 취소 (결제 전)                                   |
| ❌   | PATCH  | /chats/:id/pay                   | 요청자 결제 (ACCEPTED → PAID)                           |
| ❌   | PATCH  | /chats/:id/start                 | 그림쟁이 작업 시작 (PAID → IN_PROGRESS)                 |
| ❌   | POST   | /chats/:id/send-drawing          | 그림쟁이 그림 전송 (이미지 최대 3개)                    |
| ❌   | POST   | /chats/:id/revision              | 요청자 수정 요청 (피드백 텍스트)                        |
| ❌   | PATCH  | /chats/:id/confirm               | 요청자 최종 확인 → COMPLETED ("저장하기" = 소유권 이전) |
| ❌   | PATCH  | /chats/:id/request-price-change  | 금액 수정 요청 (수정 횟수 포함)                         |
| ❌   | POST   | /reviews                         | 후기 작성 (별점 + 키워드 + 자유 입력 + 이미지 최대 3개) |

### 구현된 기능 상세

#### 채팅방 생성 (POST /chats) ✅

- 동일 조합(게시글/요청자/작가)이 이미 존재하면 기존 채팅방 반환 (isExisting: true)
- ChatRoomStatus.REQUESTED 상태로 생성
- REQUEST_CARD 시스템 메시지 자동 생성 (kind, postId, title, price, description 포함)

#### REQUEST_CARD 시스템 메시지 렌더링 (프론트엔드 참고)

- 그림쟁이 화면: "그림 요청이 도착했어요 :) 요청서를 확인해볼까요?" + [확인하기] 버튼
  - [확인하기] 버튼 → GET /chats/:id 로 요청 상세("받은 요청확인") 화면 표시 (백엔드 API 추가 불필요)
- 요청자 화면: 요청 내용 요약 + [확인하기] 버튼
  - [확인하기] 버튼 → "보낸 요청확인" 화면 표시
  - "보낸 요청확인" 화면 하단에 **[수정하기] 버튼** 존재 → 요청 내용 수정 기능 ❌ 미구현
    - REQUESTED 상태에서만 활성화, 클릭 시 요청 내용(description 등) 수정 화면으로 이동

#### 채팅방 목록 (GET /chats) ✅

- 내가 requester 또는 artist인 채팅방 모두 조회
- lastMessage, unreadCount, 상대방 프로필 포함
- updatedAt 기준 내림차순 정렬

#### 메시지 전송 (POST /chats/:id/messages) ✅

- TEXT / IMAGE 타입 지원
- SYSTEM 타입은 직접 전송 불가 (서버에서만 생성)
- 이미지/파일은 S3 objectKey 기반 (presigned URL 발급 후 업로드)
- **메시지 길이 제한: 1000자 미만** (카카오톡과 동일)

#### 상태 변경 (PATCH /chats/:id/status) 🔧

- 현재 ChatRoom 참여자이기만 하면 누구든 어떤 상태로든 변경 가능
- → 전용 액션 API 추가 후 이 엔드포인트는 Admin 전용으로 제한 예정

### 기존 ChatRoomStatus Enum

```
REQUESTED → PAID → IN_PROGRESS → COMPLETED → REVIEWED
                 ↘ CANCELLED
```

❌ ACCEPTED, DRAFT_SENT 상태 없음 — 신규 추가 필요

---

## 상태 전이 흐름 (이미지 기준)

### 전체 흐름도

```
[요청자] 요청하기 버튼 클릭
    ↓ POST /chats (기존)
REQUESTED
    ├── [그림쟁이] 견적 수정 요청 → PATCH /chats/:id/request-price-change
    │     └ 상태 유지, 새 PAYMENT_REQUEST 카드 전송
    ├── [그림쟁이] 거절하기 → PATCH /chats/:id/reject → CANCELLED
    │     └ 거절 사유 키워드(최대 3개) + 자유 입력(5~200자)
    └── [그림쟁이] 수락하기 → PATCH /chats/:id/accept → ACCEPTED
          └ 입력: 금액, 예상 완료일, 수정 횟수(feedbackCount)
          └ 시스템 메시지 ①: ACCEPTED ("요청을 수락했어요 :)")
          └ 시스템 메시지 ②: PAYMENT_REQUEST 카드 [수락 및 결제하기] [취소하기]
ACCEPTED
    ├── [요청자] PAYMENT_REQUEST 카드 [취소하기] → PATCH /chats/:id/cancel → CANCELLED
    └── [요청자] PAYMENT_REQUEST 카드 [수락 및 결제하기] → PATCH /chats/:id/pay → PAID
          └ 시스템 메시지: PAYMENT_COMPLETED 카드 (코인 수, 예상 완료일 표시)
          └ 결제 직후 요청자에게 팝업: "그림은 총 N회 보낼 수 있습니다 / 남은 횟수 N회" (응답의 feedbackCount 활용)
          └ 그림쟁이 화면: [확인하기] 버튼 = PATCH /start 트리거
PAID
    └── [그림쟁이] PAYMENT_COMPLETED 카드 [확인하기] → PATCH /chats/:id/start → IN_PROGRESS
          └ Body 없음 (estimatedAt은 accept 시 이미 설정됨)
          └ 시스템 메시지: WORK_STARTED — "결제가 완료되어, 그림 작업이 시작됩니다 :)"
IN_PROGRESS
    └── [그림쟁이] + 메뉴 [완료된 그림 보내기] → POST /chats/:id/send-drawing → DRAFT_SENT
          └ 이미지 최대 3개 (S3 업로드 후 objectKeys 전달)
          └ 시스템 메시지: DRAWING_SENT 카드 (이미지 + [확인하기])
DRAFT_SENT  ← 신규 상태 (요청자 확인 대기)
    └── [요청자] DRAWING_SENT 카드 [확인하기]
          → 풀스크린 "보낸그림확인" 화면 열림 (프론트엔드만, API 없음)
          → 화면: 이미지 + 남은 수정 횟수 표시
          │
          ├── [저장하기] 버튼
          │     → 다이얼로그: "그림을 저장하시겠습니까? 그림 저장시, 권한이 완료됩니다."
          │     → [확인] → PATCH /chats/:id/confirm → COMPLETED
          │                    └ 시스템 메시지: WORK_COMPLETED + REVIEW_PROMPT
          │
          └── [수정 요청] 피드백 입력 후 전송
                → POST /chats/:id/revision → IN_PROGRESS (재작업 루프)
                → feedbackUsed++, 남은 횟수 있을 때만 가능

COMPLETED
    └── [요청자] REVIEW_PROMPT 카드 [작성하기] → POST /reviews → REVIEWED
          └ 별점 + 키워드(최대 3개) + 자유 후기(0/200자) + 그림(최대 3개)
REVIEWED

취소 경로 (결제 전):
REQUESTED / ACCEPTED → [요청자] 취소 → PATCH /chats/:id/cancel → CANCELLED
  └ 시스템 메시지: "앗, 요청이 취소되었습니다. 다음에 다시 만나요 :)"
  └ 참고: PAID 이후 취소는 별도 환불 정책 처리 (현재 범위 외)
```

### 레퍼런스 사진/파일 주고받기 (채팅 중 언제든 가능)

```
[양측] + 버튼 → 파일 보내기 / 사진 보내기 / 직접 촬영하기 메뉴
    ↓ POST /chats/:id/messages (기존 IMAGE 타입 활용)
채팅에 파일 카드 표시: 파일명, 유효기간(S3 URL 만료), 용량, [확인하기] / [저장하기] 버튼
```

- 레퍼런스 파일 전송은 기존 `POST /chats/:id/messages` (IMAGE 타입) 그대로 사용
- 파일 메타(파일명, 용량, 유효기간)는 프론트엔드에서 S3 objectKey 기반으로 계산·표시
- 별도 백엔드 API 추가 불필요

### 그림쟁이 메뉴 상태별 활성화

| 메뉴 항목          | IN_PROGRESS | DRAFT_SENT | COMPLETED | 기타      |
| ------------------ | ----------- | ---------- | --------- | --------- |
| 완료된 그림 보내기 | ✅ 활성     | ❌ 비활성  | ❌ 비활성 | ❌ 비활성 |
| 파일 보내기        | ✅ 활성     | ✅ 활성    | ✅ 활성   | ✅ 활성   |
| 사진 보내기        | ✅ 활성     | ✅ 활성    | ✅ 활성   | ✅ 활성   |
| 직접 촬영하기      | ✅ 활성     | ✅ 활성    | ✅ 활성   | ✅ 활성   |

> COMPLETED 상태에서 "완료된 그림 보내기 / 그림쟁이라면 가능합니다 :)" 안내 표시 검토

---

## 신규 구현 필요 API 목록 ❌

### 0. 요청자 - 요청 내용 수정 (REQUESTED 상태에서만) ❌

```
PATCH /chats/:id/request
```

- **권한**: requesterId === 로그인 유저
- **허용 상태**: REQUESTED (그림쟁이가 아직 수락/거절하지 않은 상태)
- **UI 트리거**: "보낸 요청확인" 화면 하단 [수정하기] 버튼
- **처리**:
  1. ChatRoom.description(요청 내용) 업데이트
  2. REQUEST_CARD 시스템 메시지 갱신 or 새 REQUEST_CARD 생성 (설계 결정 필요)
- **Request Body**:
  ```json
  {
    "description": "수정된 요청 내용입니다.",
    "imageObjectKeys": ["post/uuid1.jpg"]
  }
  ```
- **참고**: 수정 가능한 필드 범위(description만? 이미지도?) 추가 설계 필요

---

### 1. 그림쟁이 - 요청 수락 (REQUESTED → ACCEPTED) ❌

```
PATCH /chats/:id/accept
```

- **권한**: artistId === 로그인 유저
- **허용 상태**: REQUESTED
- **처리**:
  1. 상태: ACCEPTED
  2. ChatRoom.price, ChatRoom.estimatedAt, ChatRoom.feedbackCount 업데이트
  3. 시스템 메시지 ①: { kind: "ACCEPTED", artistNickname }
     - "그리 님의 요청을 수락했어요 :) 그림쟁이 님의 결제를 기다리고 있어요."
  4. 시스템 메시지 ②: { kind: "PAYMENT_REQUEST", price, estimatedAt, feedbackCount }
     - 요청자 화면: [수락 및 결제하기] [취소하기] 버튼 포함
- **Request Body**:
  ```json
  {
    "price": 500,
    "estimatedAt": "2024-03-20",
    "feedbackCount": 2
  }
  ```
- **시스템 메시지 예시**: "예상 코인: 500개 / 예상 완료일자: 24.03.20"

> ACCEPTED 상태 신규 추가 필요 (enum에 없음)

---

### 2. 그림쟁이 - 요청 거절 (REQUESTED → CANCELLED) ❌

```
PATCH /chats/:id/reject
```

- **권한**: artistId === 로그인 유저
- **허용 상태**: REQUESTED
- **처리**:
  1. 상태: CANCELLED
  2. 시스템 메시지: { kind: "REJECTED", reasons, reasonText }
     - "요청이 거절됐습니다. 다음에 다시 만나요 :)"
     - "보낸 요청확인" 화면에서 거절 사유 키워드 + 텍스트 확인 가능
- **Request Body**:
  ```json
  {
    "reasons": ["스타일이 달라요", "다른 작업중이에요"],
    "reasonText": "지금은 작업이 많아서요."
  }
  ```
- **거절 사유 키워드 목록** (최대 3개 선택, 이미지 기준):
  - 잠시 쉬고 있어요
  - 개인 사정이 생겼어요
  - 다른 작업중이에요
  - 스타일이 달라요
  - 생각한 가격이 아니에요
- **조건**: reasonText는 0~200자 (키워드 없어도 사유 텍스트만으로 거절 가능)
- **거절 후 요청자의 "보낸 요청확인" 화면**: 거절 사유 키워드 + 자유 텍스트 표시

---

### 3. 요청자 - 취소 (REQUESTED / ACCEPTED → CANCELLED) ❌

```
PATCH /chats/:id/cancel
```

- **권한**: requesterId === 로그인 유저
- **허용 상태**: REQUESTED, ACCEPTED
- **처리**:
  1. 상태: CANCELLED
  2. 시스템 메시지: { kind: "CANCELLED_BY_REQUESTER" }
     - "앗, 요청이 취소되었습니다. 다음에 다시 만나요 :) / 요청자의 취소요청으로 그림톡이 취소되었습니다."
- **Request Body**: 없음

> PAID 이후 취소는 환불 정책에 따라 별도 처리 (현재 범위 외)

---

### 4. 요청자 - 결제 (ACCEPTED → PAID) ❌

```
PATCH /chats/:id/pay
```

- **권한**: requesterId === 로그인 유저
- **허용 상태**: ACCEPTED
- **UI 트리거**: PAYMENT_REQUEST 카드의 [수락 및 결제하기] 버튼
- **처리**:
  1. 상태: PAID
  2. ChatRoom.paidAmount 업데이트
  3. PaymentHistory 레코드 생성
  4. 시스템 메시지: { kind: "PAYMENT_COMPLETED", paidAmount, estimatedAt }
     - 그림쟁이 화면: [확인하기] 버튼 = PATCH /start 트리거
- **Request Body**:
  ```json
  {
    "paymentMethod": "KAKAO_PAY"
  }
  ```
- **응답**: `{ feedbackCount: number }` — 결제 직후 요청자 팝업 표시에 활용
  - 프론트엔드 팝업: "그림은 총 N회 보낼 수 있습니다 / 남은 횟수 N회"
- **시스템 메시지 예시**: "결제완료! 홍길동 님! 잘부탁드려요 :) / 예상 코인: 10개 / 예상 완료일자: 24.03.20"

---

### 5. 그림쟁이 - 작업 시작 (PAID → IN_PROGRESS) ❌

```
PATCH /chats/:id/start
```

- **권한**: artistId === 로그인 유저
- **허용 상태**: PAID
- **UI 트리거**: PAYMENT_COMPLETED 카드의 [확인하기] 버튼
- **처리**:
  1. 상태: IN_PROGRESS
  2. 시스템 메시지: { kind: "WORK_STARTED" }
     - "결제가 완료되어, 그림 작업이 시작됩니다 :)"
- **Request Body**: 없음 (estimatedAt은 accept 시 이미 설정됨)
- **참고**: "그림은 총 N회 보낼 수 있습니다" 팝업은 pay 단계에서 요청자에게 표시됨 (start와 무관)

---

### 6. 그림쟁이 - 그림 전송 (IN_PROGRESS → DRAFT_SENT) ❌

```
POST /chats/:id/send-drawing
```

- **권한**: artistId === 로그인 유저
- **허용 상태**: IN_PROGRESS
- **UI 트리거**: + 메뉴의 [완료된 그림 보내기] 선택
- **처리**:
  1. 상태: DRAFT_SENT
  2. 시스템 메시지: { kind: "DRAWING_SENT", imageObjectKeys, remainingRevisions }
     - 요청자 화면: 이미지 카드 + [확인하기] 버튼
     - 그림쟁이 화면: "그림 발송 완료!" 표시
  3. 남은 수정 횟수: feedbackCount - feedbackUsed
- **Request Body**:

  ```json
  {
    "imageObjectKeys": ["chat/1/2024/03/uuid1.jpg", "chat/1/2024/03/uuid2.jpg"]
  }
  ```

  - imageObjectKeys: presigned URL로 S3 업로드 완료 후 전달 (최대 3개, 최소 1개)

- **응답**: { remainingRevisions: number }

---

### 7. 요청자 - 수정 요청 (DRAFT_SENT → IN_PROGRESS) ❌

```
POST /chats/:id/revision
```

- **권한**: requesterId === 로그인 유저
- **허용 상태**: DRAFT_SENT
- **조건**: feedbackUsed < feedbackCount (남은 수정 횟수 있을 때만)
- **UI 위치**: "보낸그림확인" 풀스크린 화면 하단 피드백 입력창
- **처리**:
  1. feedbackUsed++
  2. 상태: IN_PROGRESS
  3. 시스템 메시지: { kind: "REVISION_REQUESTED", content, remainingRevisions }
     - "수정 요청이 도착했어요 / [피드백 내용] / 남은 수정 요청 횟수: N회"
- **Request Body**:
  ```json
  {
    "content": "고양이 눈 조금 더 키워주세요 :)!"
  }
  ```

---

### 8. 요청자 - 최종 확인 ("저장하기", DRAFT_SENT → COMPLETED) ❌

```
PATCH /chats/:id/confirm
```

- **권한**: requesterId === 로그인 유저
- **허용 상태**: DRAFT_SENT
- **UI 트리거**:
  1. DRAWING_SENT 카드 [확인하기] → 풀스크린 "보낸그림확인" 화면 열림 (API 없음)
  2. [저장하기] 버튼 클릭 → 다이얼로그: "그림을 저장하시겠습니까? 그림 저장시, 권한이 완료됩니다."
  3. 다이얼로그 [확인] → PATCH /confirm 호출
- **처리**:
  1. 상태: COMPLETED
  2. 시스템 메시지 ①: { kind: "WORK_COMPLETED" } — "그림 작업이 완료되었습니다"
  3. 시스템 메시지 ②: { kind: "REVIEW_PROMPT" } — "그림이 마음에 드셨나요?! 후기를 작성해 주실 건가요? / [닉네임] 님의 후기는 그림쟁이에게 큰 도움이 됩니다!"
  4. 알림: WORK_COMPLETED → 그림쟁이
- **Request Body**: 없음
- **성공 결과**: "그림 저장 완료! 그림이 성공적으로 저장되었습니다." 화면 표시

---

### 9. 그림쟁이 - 견적/금액 수정 요청 ❌

```
PATCH /chats/:id/request-price-change
```

- **권한**: artistId === 로그인 유저
- **허용 상태**: REQUESTED, ACCEPTED
- **처리**:
  1. ChatRoom.price, ChatRoom.estimatedAt, ChatRoom.feedbackCount 업데이트
  2. 시스템 메시지: { kind: "PRICE_CHANGE_REQUEST", price, estimatedAt, feedbackCount, reason }
     - 요청자 화면: 새 PAYMENT_REQUEST 카드 + [수락 및 결제하기] [취소하기]
- **Request Body**:

  ```json
  {
    "price": 700,
    "estimatedAt": "2024-03-20",
    "feedbackCount": 1,
    "reason": "채색 작업이 추가되어 금액이 변경되었습니다."
  }
  ```

  - reason: 0~200자 자유 입력
  - feedbackCount: 수정 횟수 재설정 가능

---

### 10. 후기 작성 (COMPLETED → REVIEWED) ❌

```
POST /reviews
```

- **권한**: requesterId === 로그인 유저
- **허용 상태**: COMPLETED (채팅방당 1회만)
- **UI 트리거**: REVIEW_PROMPT 카드 [작성하기] → 후기 올리기 화면
- **처리**:
  1. ChatRoom 상태: REVIEWED
  2. Review 레코드 생성
  3. 알림: REVIEW_RECEIVED → 그림쟁이
- **Request Body**:
  ```json
  {
    "chatRoomId": 1,
    "star": 4,
    "keywords": ["귀여워요", "친절해요", "섬세해요"],
    "content": "요청사항을 너무 잘 들어주세요! 원하던 그림을 얻을 수 있어 너무 좋아요 ㅎㅎ",
    "imageObjectKeys": ["review/1/2024/03/uuid1.jpg"]
  }
  ```
- **리뷰 키워드 목록** (최대 3개 선택):
  - 귀여워요 / 느낌있어요 / 센스 있어요
  - 원하는 대로 그려줘요 / 친절해요
  - 섬세해요 / 속도가 빠라요 / 실력이 좋아요
  - 또 이용하고 싶어요 / 진심입니다
- **이미지**: 최대 3개, S3 presigned URL 업로드 후 objectKey 전달 (선택)

---

## 기존 API 수정 사항

### PATCH /chats/:id/status 개선 🔧

전용 액션 API로 대체. 기존 API는 Admin 전용으로만 유지.

---

## Entity 변경 사항

### ChatRoom Entity 추가 컬럼 ❌

```typescript
@Column({ name: 'estimated_at', type: 'date', nullable: true })
estimatedAt: Date;  // 예상 완료일 (수락/견적수정 시 설정)

@Column({ name: 'feedback_count', default: 1 })
feedbackCount: number;  // 총 수정 허용 횟수 (수락/견적수정 시 설정)

@Column({ name: 'feedback_used', default: 0 })
feedbackUsed: number;  // 사용한 수정 횟수 (수정 요청 시 증가)
```

> synchronize: true 환경이므로 컬럼 추가만으로 DB 자동 반영

### ChatRoomStatus Enum 추가 ❌

```typescript
export enum ChatRoomStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED', // 신규: 그림쟁이 수락 완료
  PAID = 'PAID',
  IN_PROGRESS = 'IN_PROGRESS',
  DRAFT_SENT = 'DRAFT_SENT', // 신규: 그림 전송됨, 요청자 확인 대기
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED',
  CANCELLED = 'CANCELLED',
}
```

---

## 시스템 메시지 kind 전체 목록

| kind                   | 발생 시점                     | 요청자 UI                        | 그림쟁이 UI                 |
| ---------------------- | ----------------------------- | -------------------------------- | --------------------------- |
| REQUEST_CARD           | 채팅방 생성                   | 요청 내용 카드 + [확인하기]      | 요청 도착 카드 + [확인하기] |
| ACCEPTED               | 그림쟁이 수락                 | "요청을 수락했어요 :)"           | (본인 수락 확인)            |
| PAYMENT_REQUEST        | 수락 직후 / 견적 재수정       | 결제 카드 + [결제] [취소]        | 결제 대기 카드              |
| PRICE_CHANGE_REQUEST   | 견적 수정 요청                | 새 결제 카드 + [결제] [취소]     | (본인 요청 확인)            |
| PAYMENT_COMPLETED      | 결제 완료                     | "결제완료 :)"                    | 결제 완료 카드 + [확인하기] |
| WORK_STARTED           | 그림쟁이 작업 시작            | "작업이 시작됐어요"              | (본인 시작 확인)            |
| DRAWING_SENT           | 그림 전송 완료                | 그림 카드 + [확인하기]           | "그림 발송 완료!"           |
| REVISION_REQUESTED     | 수정 요청                     | (본인 요청 확인)                 | "수정 요청 도착!"           |
| WORK_COMPLETED         | 요청자 최종 확인 (저장하기)   | "그림 저장 완료                  | "작업 완료 :)"              |
| REVIEW_PROMPT          | WORK_COMPLETED 직후 자동 생성 | 후기 유도 카드 + [작성하기]      | (표시 생략 or 동일)         |
| REJECTED               | 그림쟁이 거절                 | "요청 거절됐습니다" + [사유확인] | (본인 거절 확인)            |
| CANCELLED_BY_REQUESTER | 요청자 취소                   | (본인 취소 확인)                 | "요청이 취소됐습니다"       |

---

## 구현 순서 (권장)

| 순서 | 상태 | 작업 내용                                                                                      |
| ---- | ---- | ---------------------------------------------------------------------------------------------- |
| 1    | ✅   | ChatRoomStatus enum에 ACCEPTED, DRAFT_SENT 추가 + ChatRoom 엔티티 3개 컬럼 추가                |
| 1-1  | ✅   | 메시지 전송 1000자 유효성 검사 추가 (기존 POST /chats/:id/messages)                            |
| 1-2  | ❌   | 요청 내용 수정 API — PATCH /chats/:id/request (REQUESTED 상태, 요청자 전용, 미설계)            |
| 2    | ❌   | PATCH /chats/:id/accept — 그림쟁이 수락 (ACCEPTED + PAYMENT_REQUEST 카드 2개 생성)             |
| 3    | ❌   | PATCH /chats/:id/reject — 그림쟁이 거절 (사유 키워드 + 자유 입력)                              |
| 4    | ❌   | PATCH /chats/:id/cancel — 요청자 취소 (REQUESTED / ACCEPTED 상태에서만)                        |
| 5    | ❌   | PATCH /chats/:id/request-price-change — 견적 수정 + 새 PAYMENT_REQUEST 카드                    |
| 6    | ❌   | PATCH /chats/:id/pay — 결제 + PaymentHistory 생성 + PAYMENT_COMPLETED 카드                     |
| 7    | ❌   | PATCH /chats/:id/start — 작업 시작 (Body 없음, PAYMENT_COMPLETED 카드 [확인하기] 트리거)       |
| 8    | ❌   | POST /chats/:id/send-drawing — 그림 전송 (imageObjectKeys 최대 3개, DRAFT_SENT 전환)           |
| 9    | ❌   | POST /chats/:id/revision — 수정 요청 (feedbackUsed 검증, IN_PROGRESS 복귀)                     |
| 10   | ❌   | PATCH /chats/:id/confirm — 최종 확인 ("저장하기" → COMPLETED + WORK_COMPLETED + REVIEW_PROMPT) |
| 11   | ❌   | POST /reviews — 후기 작성 (별점 + 키워드 + 자유 입력 + 이미지, REVIEWED 전환)                  |
| 12   | 🔧   | 기존 PATCH /chats/:id/status Admin 전용으로 제한                                               |

---

## 알림(Notification) 연동

| 이벤트         | NotificationType  | 수신자   | 비고                                 |
| -------------- | ----------------- | -------- | ------------------------------------ |
| 요청 도착      | REQUEST_ARRIVED   | 그림쟁이 | POST /chats                          |
| 결제 완료      | PAYMENT_CONFIRMED | 그림쟁이 | PATCH /pay                           |
| 작업 시작      | WORK_STARTED      | 요청자   | PATCH /start                         |
| 그림 전송      | NEW_MESSAGE       | 요청자   | ⚠️ DRAWING_SENT enum 추가 검토       |
| 수정 요청 도착 | NEW_MESSAGE       | 그림쟁이 | ⚠️ REVISION_REQUESTED enum 추가 검토 |
| 최종 확인 완료 | WORK_COMPLETED    | 그림쟁이 | PATCH /confirm                       |
| 후기 작성됨    | REVIEW_RECEIVED   | 그림쟁이 | POST /reviews                        |

---

## WebSocket 이벤트 (기존 채팅 WebSocket 연동)

각 상태 전이 API 완료 후 해당 채팅방의 소켓 룸으로 이벤트 emit:

```
chat:status-changed  → { chatRoomId, status }
chat:new-message     → MessageResponseDto (시스템 메시지 포함)
```
