import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
import { LatestContentsQueryDto } from './dto/latest-contents-query.dto';
import { PostFeedQueryRepository } from './query/post-feed.query.repository';
import { PostFeedMapper } from './mapper/post-feed.mapper';

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
    private readonly postFeedQueryRepository: PostFeedQueryRepository,
    private readonly postFeedMapper: PostFeedMapper,
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
    if (queryDto.scrappedOnly && !memberId) {
      throw new UnauthorizedException(
        'Authentication required for scrappedOnly filter',
      );
    }

    const { posts, total, page, limit } =
      await this.postFeedQueryRepository.findLatestPosts(queryDto, memberId);

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
      return this.postFeedMapper.toLatestContentsResponse(post, {
        tags: tagMap.get(post.id) || [],
        likeCount: likeMap.get(post.id) || 0,
        profileImageUrl: profileMap.get(uploaderId),
        drawingCount: drawingCountMap.get(uploaderId) || 0,
        reviewStat: reviewStatsMap.get(uploaderId),
      });
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

    const data = posts.map((post) =>
      this.postFeedMapper.toMemberContentsDto(post, {
        tags: tagMap.get(post.id) || [],
        likeCount: likeMap.get(post.id) || 0,
      }),
    );

    return { data, total, page, limit };
  }

  async countDrawingsByMemberIds(
    memberIds: number[],
  ): Promise<Map<number, number>> {
    return this.postFeedQueryRepository.countDrawingsByMemberIds(memberIds);
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
