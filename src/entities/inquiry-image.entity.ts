import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inquiry } from './inquiry.entity';

@Entity('inquiry_image')
export class InquiryImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  @Column({ name: 'inquiry_id' })
  inquiryId: number;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.images)
  @JoinColumn({ name: 'inquiry_id' })
  inquiry: Inquiry;
}
