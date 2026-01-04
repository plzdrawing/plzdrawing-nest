import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { Post } from './post.entity';

@Entity('scrap')
export class Scrap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({ name: 'post_id' })
  postId: number;

  @ManyToOne(() => Member, (member) => member.scraps)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => Post, (post) => post.scraps)
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
