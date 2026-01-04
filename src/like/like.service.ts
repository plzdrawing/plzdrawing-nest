import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LikeEntity } from '../entities/like-entity.entity';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(LikeEntity)
    private readonly likeRepository: Repository<LikeEntity>,
  ) {}

  async countLikesByContentIds(
    contentIds: number[],
  ): Promise<Map<number, number>> {
    if (contentIds.length === 0) {
      return new Map();
    }

    const results = await this.likeRepository
      .createQueryBuilder('like')
      .leftJoin('like.post', 'post')
      .select('post.id', 'contentId')
      .addSelect('COUNT(like.id)', 'count')
      .where('post.id IN (:...contentIds)', { contentIds })
      .groupBy('post.id')
      .getRawMany();

    const map = new Map<number, number>();
    results.forEach((result) => {
      map.set(parseInt(result.contentId), parseInt(result.count));
    });

    return map;
  }
}
