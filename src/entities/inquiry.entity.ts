import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InquiryCategory, InquiryStatus } from '../common/enums';
import { Member } from './member.entity';
import { InquiryImage } from './inquiry-image.entity';

@Entity('inquiry')
export class Inquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: InquiryCategory,
    nullable: true,
  })
  category: InquiryCategory;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({
    type: 'enum',
    enum: InquiryStatus,
    nullable: true,
  })
  status: InquiryStatus;

  @Column({ type: 'text', nullable: true })
  answer: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'answered_at', nullable: true })
  answeredAt: Date;

  @Column({ name: 'closed_at', nullable: true })
  closedAt: Date;

  @Column({ name: 'member_id' })
  memberId: number;

  @Column({ name: 'admin_id', nullable: true })
  adminId: number;

  @ManyToOne(() => Member, (member) => member.inquiries)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => Member, (member) => member.answeredInquiries)
  @JoinColumn({ name: 'admin_id' })
  admin: Member;

  @OneToMany(() => InquiryImage, (image) => image.inquiry)
  images: InquiryImage[];
}
