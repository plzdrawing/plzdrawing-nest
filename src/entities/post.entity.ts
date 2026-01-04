import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { PostCategory } from '../common/enums';
import { Member } from './member.entity';
import { PostImage } from './post-image.entity';
import { PostTag } from './post-tag.entity';
import { Comment } from './comment.entity';
import { Scrap } from './scrap.entity';
import { Review } from './review.entity';
import { ChatRoom } from './chat-room.entity';

@Entity('post')
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({ nullable: true })
  title: string;

  @Column({
    type: 'enum',
    enum: PostCategory,
    nullable: true,
  })
  category: PostCategory;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @ManyToOne(() => Member, (member) => member.posts)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @OneToMany(() => PostImage, (postImage) => postImage.post)
  images: PostImage[];

  @OneToMany(() => PostTag, (postTag) => postTag.post)
  postTags: PostTag[];

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => Scrap, (scrap) => scrap.post)
  scraps: Scrap[];

  @OneToMany(() => Review, (review) => review.post)
  reviews: Review[];

  @OneToMany(() => ChatRoom, (chatRoom) => chatRoom.post)
  chatRooms: ChatRoom[];
}
