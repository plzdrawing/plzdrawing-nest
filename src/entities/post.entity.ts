import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ description: '게시글 ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '작성자 ID', example: 1 })
  @Column({ name: 'member_id' })
  memberId: number;

  @ApiProperty({ description: '제목', example: '그림 그려주세요' })
  @Column({ nullable: true })
  title: string;

  @ApiProperty({
    description: '카테고리',
    enum: PostCategory,
    example: PostCategory.REQUEST,
  })
  @Column({
    type: 'enum',
    enum: PostCategory,
    nullable: true,
  })
  category: PostCategory;

  @ApiProperty({ description: '내용', example: '상세 내용입니다.' })
  @Column({ type: 'text', nullable: true })
  content: string;

  @ApiProperty({
    description: '썸네일 URL',
    example: 'https://example.com/image.jpg',
  })
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
