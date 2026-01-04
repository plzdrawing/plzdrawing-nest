import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Member } from './member.entity';

@Entity('notice')
export class Notice extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'admin_id' })
  adminId: number;

  @ManyToOne(() => Member, (member) => member.notices)
  @JoinColumn({ name: 'admin_id' })
  admin: Member;
}
