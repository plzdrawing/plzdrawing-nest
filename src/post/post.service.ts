import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Post } from '../entities/post.entity';
import { PostImage } from '../entities/post-image.entity';
import { Member } from '../entities/member.entity';
import { AwsService } from '../common/aws/aws.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TagService } from '../tag/tag.service';
import { LikeService } from '../like/like.service';
import { ReviewService } from '../review/review.service';
import { MemberService } from '../member/member.service';
import { LatestContentsResponse } from './dto/latest-contents-response.dto';
import { ContentsDto } from './dto/contents.dto';
import { UploaderDto } from './dto/uploader.dto';
import { LatestContentsQueryDto } from './dto/latest-contents-query.dto';
import { TagStatus } from '../common/enums';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostImage)
    private readonly postImageRepository: Repository<PostImage>,
    private readonly awsService: AwsService,
    private readonly tagService: TagService,
    private readonly likeService: LikeService,
    private readonly reviewService: ReviewService,
    private readonly memberService: MemberService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    member: Member,
    data: Partial<Post>,
    files?: Array<Express.Multer.File>,
  ): Promise<Post> {
    const { hashTag, ...postData } = data as Partial<Post> & {
      hashTag?: string[];
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const post = queryRunner.manager.create(Post, {
        ...postData,
        member,
      });
      const savedPost = await queryRunner.manager.save(post);

      if (files && files.length > 0) {
        const imageUrls = await this.awsService.uploadFiles(files, 'posts');

        const postImages = imageUrls.map((url) =>
          queryRunner.manager.create(PostImage, {
            imageUrl: url,
            post: savedPost,
          }),
        );

        await queryRunner.manager.save(postImages);

        // 첫 번째 이미지를 썸네일로 설정
        savedPost.thumbnailUrl = imageUrls[0];
        await queryRunner.manager.save(savedPost);
      }

      await queryRunner.commitTransaction();

      if (hashTag !== undefined) {
        await this.tagService.syncTags(
          savedPost,
          this.normalizeHashTags(hashTag),
        );
      }

      return this.findOne(savedPost.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<{ data: Post[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10 } = paginationDto;
    const [data, total] = await this.postRepository.findAndCount({
      relations: ['member', 'images', 'postTags', 'postTags.tag'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByMember(
    memberId: number,
    paginationDto: PaginationDto,
  ): Promise<{ data: Post[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10 } = paginationDto;
    const [data, total] = await this.postRepository.findAndCount({
      where: { memberId },
      relations: ['member', 'images', 'postTags', 'postTags.tag'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getLatestContents(
    queryDto: LatestContentsQueryDto,
    memberId?: number,
  ): Promise<{
    data: LatestContentsResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
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

    if (scrappedOnly) {
      if (!memberId) {
        throw new UnauthorizedException(
          'Authentication required for scrappedOnly filter',
        );
      }
      qb.innerJoin('post.scraps', 'scrap', 'scrap.memberId = :memberId', {
        memberId,
      });
    }

    qb.orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [posts, total] = await qb.getManyAndCount();

    if (posts.length === 0) {
      return { data: [], total, page, limit };
    }

    const contentIds = posts.map((p) => p.id);
    const memberIds = [...new Set(posts.map((p) => p.memberId))];

    const tagMap = await this.tagService.findTagsByContentIds(contentIds);
    const likeMap = await this.likeService.countLikesByContentIds(contentIds);
    const profileMap =
      await this.memberService.findProfileImageUrlByMemberIds(memberIds);
    const drawingCountMap = await this.countDrawingsByMemberIds(memberIds);
    const reviewStatsMap =
      await this.reviewService.findSellingMemberStats(memberIds);

    const data = posts.map((post) => {
      const uploaderId = post.memberId;
      const stats = reviewStatsMap.get(uploaderId) || {
        reviewCount: 0,
        star: 0,
      };

      const uploaderDto = new UploaderDto(
        post.member.nickname,
        profileMap.get(uploaderId),
        drawingCountMap.get(uploaderId) || 0,
        stats.reviewCount,
        stats.star,
      );

      const contentsDto = new ContentsDto(
        post.id,
        post.createdAt,
        post.images.map((img) => img.imageUrl),
        tagMap.get(post.id) || [],
        post.content,
        post.category ? post.category.toString() : '',
        0, // price
        likeMap.get(post.id) || 0,
      );

      return new LatestContentsResponse(uploaderDto, contentsDto);
    });

    return { data, total, page, limit };
  }

  async getMemberContents(
    memberId: number,
    paginationDto: PaginationDto,
  ): Promise<{
    data: ContentsDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const [posts, total] = await this.postRepository.findAndCount({
      where: { memberId },
      relations: ['images'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (posts.length === 0) {
      return { data: [], total, page, limit };
    }

    const contentIds = posts.map((p) => p.id);
    const tagMap = await this.tagService.findTagsByContentIds(contentIds);
    const likeMap = await this.likeService.countLikesByContentIds(contentIds);

    const data = posts.map((post) => {
      return new ContentsDto(
        post.id,
        post.createdAt,
        post.images.map((img) => img.imageUrl),
        tagMap.get(post.id) || [],
        post.content,
        '', // timeTaken
        0, // price
        likeMap.get(post.id) || 0,
      );
    });

    return { data, total, page, limit };
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

  async findOne(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: [
        'member',
        'images',
        'postTags',
        'postTags.tag',
        'comments',
        'comments.member',
      ],
    });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }

  async update(id: number, data: Partial<Post>): Promise<Post> {
    const { hashTag, ...postData } = data as Partial<Post> & {
      hashTag?: string[];
    };

    const existing = await this.postRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    await this.postRepository.update(id, postData);

    if (hashTag !== undefined) {
      await this.tagService.syncTags(existing, this.normalizeHashTags(hashTag));
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.postRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    await this.postRepository.delete(id);
  }

  async updateByOwner(
    id: number,
    member: Member,
    data: Partial<Post>,
  ): Promise<Post> {
    const existing = await this.postRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    if (existing.memberId !== member.id) {
      throw new ForbiddenException('No permission to update this post');
    }

    return this.update(id, data);
  }

  async removeByOwner(id: number, member: Member): Promise<void> {
    const existing = await this.postRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    if (existing.memberId !== member.id) {
      throw new ForbiddenException('No permission to delete this post');
    }

    await this.postRepository.delete(id);
  }

  private normalizeHashTags(hashTag: string[]): string[] {
    return hashTag
      .map((tag) => tag?.trim())
      .filter((tag): tag is string => Boolean(tag));
  }
}
