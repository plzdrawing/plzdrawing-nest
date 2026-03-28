import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { LatestContentsQueryDto } from '../dto/latest-contents-query.dto';
import { TagStatus } from '../../common/enums';

@Injectable()
export class PostFeedQueryRepository {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async findLatestPosts(
    queryDto: LatestContentsQueryDto,
    memberId?: number,
  ): Promise<{ posts: Post[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, q, scrappedOnly } = queryDto;

    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.member', 'member')
      .leftJoinAndSelect('post.images', 'images')
      .leftJoin(
        'post.postTags',
        'postTag',
        'postTag.status = :activeTagStatus',
        {
          activeTagStatus: TagStatus.ACTIVE,
        },
      )
      .leftJoin('postTag.tag', 'tag');

    const keyword = q?.trim();
    if (keyword) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('member.nickname LIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('post.content LIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('tag.name LIKE :keyword', { keyword: `%${keyword}%` });
        }),
      );
    }

    if (scrappedOnly && memberId) {
      qb.innerJoin('post.scraps', 'scrap', 'scrap.memberId = :memberId', {
        memberId,
      });
    }

    qb.orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [posts, total] = await qb.getManyAndCount();
    return { posts, total, page, limit };
  }

  async countDrawingsByMemberIds(
    memberIds: number[],
  ): Promise<Map<number, number>> {
    if (memberIds.length === 0) return new Map();

    const results = await this.postRepository
      .createQueryBuilder('post')
      .select('post.member_id', 'memberId')
      .addSelect('COUNT(post.id)', 'count')
      .where('post.member_id IN (:...memberIds)', { memberIds })
      .groupBy('post.member_id')
      .getRawMany<{ memberId: string; count: string }>();

    const map = new Map<number, number>();
    results.forEach((r) =>
      map.set(parseInt(r.memberId, 10), parseInt(r.count, 10)),
    );
    return map;
  }
}
