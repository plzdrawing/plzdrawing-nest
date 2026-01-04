import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TagStatus } from '../common/enums';
import { Post } from './post.entity';
import { Tag } from './tag.entity';

@Entity('post_tag')
export class PostTag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'post_id' })
  postId: number;

  @Column({ name: 'tag_id' })
  tagId: number;

  @Column({
    type: 'enum',
    enum: TagStatus,
    nullable: true,
  })
  status: TagStatus;

  @ManyToOne(() => Post, (post) => post.postTags)
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => Tag, (tag) => tag.postTags)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
