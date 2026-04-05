import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { MemberProvider, MemberRole, MemberStatus } from '../common/enums';
import { Profile } from './profile.entity';
import { MemberTag } from './member-tag.entity';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { Scrap } from './scrap.entity';
import { Review } from './review.entity';
import { ChatRoom } from './chat-room.entity';
import { Message } from './message.entity';
import { PaymentHistory } from './payment-history.entity';
import { Notification } from './notification.entity';
import { Inquiry } from './inquiry.entity';
import { Notice } from './notice.entity';
import { Terms } from './terms.entity';
import { Tag } from './tag.entity';
import { NotificationPreference } from './notification-preference.entity';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { CoinOrder } from './coin-order.entity';
import { WithdrawAccount } from './withdraw-account.entity';

@Entity('member')
export class Member extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({
    type: 'enum',
    enum: MemberProvider,
    nullable: true,
  })
  provider: MemberProvider;

  @Column({
    type: 'enum',
    enum: MemberStatus,
    nullable: true,
  })
  status: MemberStatus;

  @Column({
    type: 'enum',
    enum: MemberRole,
    nullable: true,
  })
  role: MemberRole;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_marketing_agreed', default: false })
  isMarketingAgreed: boolean;

  @OneToOne(() => Profile, (profile: Profile) => profile.member)
  profile: Profile;

  @OneToMany(() => MemberTag, (memberTag: MemberTag) => memberTag.member)
  memberTags: MemberTag[];

  @OneToMany(() => Tag, (tag: Tag) => tag.createdBy)
  createdTags: Tag[];

  @OneToMany(() => Post, (post: Post) => post.member)
  posts: Post[];

  @OneToMany(() => Comment, (comment: Comment) => comment.member)
  comments: Comment[];

  @OneToMany(() => Scrap, (scrap: Scrap) => scrap.member)
  scraps: Scrap[];

  @OneToMany(() => Review, (review: Review) => review.writer)
  writtenReviews: Review[];

  @OneToMany(() => Review, (review: Review) => review.receiver)
  receivedReviews: Review[];

  @OneToMany(() => ChatRoom, (chatRoom: ChatRoom) => chatRoom.requester)
  requestedChatRooms: ChatRoom[];

  @OneToMany(() => ChatRoom, (chatRoom: ChatRoom) => chatRoom.artist)
  artistChatRooms: ChatRoom[];

  @OneToMany(() => Message, (message: Message) => message.sender)
  messages: Message[];

  @OneToMany(() => PaymentHistory, (payment: PaymentHistory) => payment.sender)
  sentPayments: PaymentHistory[];

  @OneToMany(
    () => PaymentHistory,
    (payment: PaymentHistory) => payment.receiver,
  )
  receivedPayments: PaymentHistory[];

  @OneToMany(
    () => Notification,
    (notification: Notification) => notification.member,
  )
  notifications: Notification[];

  @OneToOne(
    () => NotificationPreference,
    (notificationPreference) => notificationPreference.member,
  )
  notificationPreference: NotificationPreference;

  @OneToOne(() => Wallet, (wallet) => wallet.member)
  wallet: Wallet;

  @OneToMany(
    () => Notification,
    (notification: Notification) => notification.sender,
  )
  sentNotifications: Notification[];

  @OneToMany(
    () => Notification,
    (notification: Notification) => notification.receiver,
  )
  receivedNotifications: Notification[];

  @OneToMany(() => Inquiry, (inquiry: Inquiry) => inquiry.member)
  inquiries: Inquiry[];

  @OneToMany(() => Inquiry, (inquiry: Inquiry) => inquiry.admin)
  answeredInquiries: Inquiry[];

  @OneToMany(() => Notice, (notice: Notice) => notice.admin)
  notices: Notice[];

  @OneToMany(() => Terms, (terms: Terms) => terms.admin)
  terms: Terms[];

  @OneToMany(
    () => WalletTransaction,
    (walletTransaction) => walletTransaction.member,
  )
  walletTransactions: WalletTransaction[];

  @OneToMany(() => CoinOrder, (coinOrder) => coinOrder.member)
  coinOrders: CoinOrder[];

  @OneToMany(() => WithdrawAccount, (withdrawAccount) => withdrawAccount.member)
  withdrawAccounts: WithdrawAccount[];
}
