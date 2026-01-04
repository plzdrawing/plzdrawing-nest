import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ChatRoomStatus } from '../common/enums';
import { Member } from './member.entity';
import { Post } from './post.entity';
import { Message } from './message.entity';

@Entity('chat_room')
export class ChatRoom extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ChatRoomStatus,
    nullable: true,
  })
  status: ChatRoomStatus;

  @Column({ name: 'requester_id' })
  requesterId: number;

  @Column({ name: 'artist_id' })
  artistId: number;

  @Column({ name: 'post_id' })
  postId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  price: number;

  @Column({ name: 'paid_amount', nullable: true })
  paidAmount: number;

  @ManyToOne(() => Member, (member) => member.requestedChatRooms)
  @JoinColumn({ name: 'requester_id' })
  requester: Member;

  @ManyToOne(() => Member, (member) => member.artistChatRooms)
  @JoinColumn({ name: 'artist_id' })
  artist: Member;

  @ManyToOne(() => Post, (post) => post.chatRooms)
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @OneToMany(() => Message, (message) => message.chatRoom)
  messages: Message[];
}
