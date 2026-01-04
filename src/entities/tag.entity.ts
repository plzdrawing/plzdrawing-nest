import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TagStatus } from '../common/enums';
import { Member } from './member.entity';
import { MemberTag } from './member-tag.entity';
import { PostTag } from './post-tag.entity';

@Entity('tag')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: TagStatus,
    nullable: true,
  })
  status: TagStatus;

  @Column({ name: 'created_by', nullable: true })
  createdById: number;

  @ManyToOne(() => Member, (member) => member.createdTags)
  @JoinColumn({ name: 'created_by' })
  createdBy: Member;

  @OneToMany(() => MemberTag, (memberTag) => memberTag.tag)
  memberTags: MemberTag[];

  @OneToMany(() => PostTag, (postTag) => postTag.tag)
  postTags: PostTag[];
}
