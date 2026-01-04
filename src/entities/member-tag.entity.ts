import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TagStatus } from '../common/enums';
import { Member } from './member.entity';
import { Tag } from './tag.entity';

@Entity('member_tag')
export class MemberTag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({ name: 'tag_id' })
  tagId: number;

  @Column({
    type: 'enum',
    enum: TagStatus,
    nullable: true,
  })
  status: TagStatus;

  @ManyToOne(() => Member, (member) => member.memberTags)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => Tag, (tag) => tag.memberTags)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
