import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MessageType } from '../common/enums';
import { Member } from './member.entity';
import { ChatRoom } from './chat-room.entity';

@Entity('message')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'sender_id' })
  senderId: number;

  @Column({ name: 'chat_room_id' })
  chatRoomId: number;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    nullable: true,
  })
  type: MessageType;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;

  @ManyToOne(() => Member, (member) => member.messages)
  @JoinColumn({ name: 'sender_id' })
  sender: Member;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages)
  @JoinColumn({ name: 'chat_room_id' })
  chatRoom: ChatRoom;
}
