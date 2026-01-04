import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Review } from '../entities/review.entity';
import { ReviewStar } from '../common/enums';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async findSellingMemberStats(
    memberIds: number[],
  ): Promise<Map<number, { reviewCount: number; star: number }>> {
    if (memberIds.length === 0) return new Map();

    const reviews = await this.reviewRepository.find({
      where: { receiverId: In(memberIds) },
    });

    const stats = new Map<number, { count: number; sum: number }>();

    reviews.forEach((review) => {
      const starValue = this.convertStarToNumber(review.star);
      if (!stats.has(review.receiverId)) {
        stats.set(review.receiverId, { count: 0, sum: 0 });
      }
      const stat = stats.get(review.receiverId);
      stat.count++;
      stat.sum += starValue;
    });

    const result = new Map<number, { reviewCount: number; star: number }>();
    stats.forEach((val, key) => {
      result.set(key, {
        reviewCount: val.count,
        star: val.count > 0 ? val.sum / val.count : 0,
      });
    });

    return result;
  }

  private convertStarToNumber(star: ReviewStar): number {
    switch (star) {
      case ReviewStar.ONE:
        return 1;
      case ReviewStar.TWO:
        return 2;
      case ReviewStar.THREE:
        return 3;
      case ReviewStar.FOUR:
        return 4;
      case ReviewStar.FIVE:
        return 5;
      default:
        return 0;
    }
  }
}
