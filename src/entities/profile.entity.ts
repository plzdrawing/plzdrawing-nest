import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from './member.entity';

@Entity('profile')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({ name: 'profile_url', nullable: true })
  profileUrl: string;

  @Column({ nullable: true })
  introduction: string;

  @OneToOne(() => Member, (member) => member.profile)
  @JoinColumn({ name: 'member_id' })
  member: Member;
}
