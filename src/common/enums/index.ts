export enum MemberProvider {
  EMAIL = 'EMAIL',
  KAKAO = 'KAKAO',
  NAVER = 'NAVER',
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  INACTIVE = 'INACTIVE',
}

export enum MemberRole {
  ROLE_TEMP = 'ROLE_TEMP',
  ROLE_MEMBER = 'ROLE_MEMBER',
  ROLE_ADMIN = 'ROLE_ADMIN',
}

export enum TagStatus {
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  INACTIVE = 'INACTIVE',
}

export enum PostCategory {
  REQUEST = 'REQUEST',
  DRAWING = 'DRAWING',
  ACCOUNT = 'ACCOUNT',
  PAYMENT = 'PAYMENT',
  GUIDE = 'GUIDE',
  ETC = 'ETC',
}

export enum ReviewStar {
  ONE = 'ONE',
  TWO = 'TWO',
  THREE = 'THREE',
  FOUR = 'FOUR',
  FIVE = 'FIVE',
}

export enum ChatRoomStatus {
  REQUESTED = 'REQUESTED',
  PAID = 'PAID',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED',
  CANCELLED = 'CANCELLED',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

export enum PaymentMethod {
  KAKAO_PAY = 'KAKAO_PAY',
  NAVER_PAY = 'NAVER_PAY',
  CREDIT_CARD = 'CREDIT_CARD',
  TOSS_PAY = 'TOSS_PAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentType {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
}

export enum NotificationType {
  REQUEST_ARRIVED = 'REQUEST_ARRIVED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  WORK_STARTED = 'WORK_STARTED',
  WORK_COMPLETED = 'WORK_COMPLETED',
  NEW_MESSAGE = 'NEW_MESSAGE',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
}

export enum InquiryCategory {
  DRAWING = 'DRAWING',
  ACCOUNT = 'ACCOUNT',
  PAYMENT = 'PAYMENT',
  REVIEW = 'REVIEW',
  ETC = 'ETC',
}

export enum InquiryStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
}
