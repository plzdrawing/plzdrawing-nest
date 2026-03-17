import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReviewStar } from '../common/enums';
import { Member } from './member.entity';
import { Post } from './post.entity';
import { ReviewKeywordMap } from './review-keyword-map.entity';

@Entity('review')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({
    type: 'enum',
    enum: ReviewStar,
    nullable: true,
  })
  star: ReviewStar;

  @Column({ name: 'writer_id' })
  writerId: number;

  @Column({ name: 'receiver_id' })
  receiverId: number;

  @Column({ name: 'post_id' })
  postId: number;

  @Column({ name: 'chat_room_id', nullable: true })
  chatRoomId: number;

  @Column({ name: 'image_object_keys', type: 'json', nullable: true })
  imageObjectKeys: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Member, (member) => member.writtenReviews)
  @JoinColumn({ name: 'writer_id' })
  writer: Member;

  @ManyToOne(() => Member, (member) => member.receivedReviews)
  @JoinColumn({ name: 'receiver_id' })
  receiver: Member;

  @ManyToOne(() => Post, (post) => post.reviews)
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @OneToMany(() => ReviewKeywordMap, (map) => map.review)
  reviewKeywordMaps: ReviewKeywordMap[];
}
