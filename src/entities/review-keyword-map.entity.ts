import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Review } from './review.entity';
import { ReviewKeyword } from './review-keyword.entity';

@Entity('review_keyword_map')
export class ReviewKeywordMap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'review_id' })
  reviewId: number;

  @Column({ name: 'keyword_id' })
  keywordId: number;

  @ManyToOne(() => Review, (review) => review.reviewKeywordMaps)
  @JoinColumn({ name: 'review_id' })
  review: Review;

  @ManyToOne(() => ReviewKeyword)
  @JoinColumn({ name: 'keyword_id' })
  keyword: ReviewKeyword;
}
