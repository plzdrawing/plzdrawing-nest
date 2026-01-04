import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Member } from './member.entity';

@Entity('terms')
export class Terms extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  title: string;

  @Column({ length: 50, nullable: true })
  version: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'admin_id' })
  adminId: number;

  @ManyToOne(() => Member, (member) => member.terms)
  @JoinColumn({ name: 'admin_id' })
  admin: Member;
}
