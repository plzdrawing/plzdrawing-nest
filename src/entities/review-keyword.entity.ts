import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('review_keyword')
export class ReviewKeyword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, nullable: true })
  keyword: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
