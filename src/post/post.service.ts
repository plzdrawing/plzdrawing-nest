import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { LatestContentsQueryDto } from './dto/latest-contents-query.dto';
import { PostFeedQueryRepository } from './query/post-feed.query.repository';
import { PostFeedMapper } from './mapper/post-feed.mapper';

const MAX_POST_IMAGE_COUNT = 3;

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
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
    data: CreatePostDto,
    files?: Array<Express.Multer.File>,
  ): Promise<Post> {
    const { hashTag, ...postData } = data;

    if (files && files.length > MAX_POST_IMAGE_COUNT) {
      throw new BadRequestException(
        `이미지는 최대 ${MAX_POST_IMAGE_COUNT}개까지 업로드할 수 있습니다.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedPost: Post;
    try {
      const post = queryRunner.manager.create(Post, {
        ...postData,
        member,
      });
      savedPost = await queryRunner.manager.save(post);

      if (files && files.length > 0) {
        const imageUrls = await this.awsService.uploadFiles(files, 'posts');

        const postImages = imageUrls.map((url) =>
          queryRunner.manager.create(PostImage, {
            imageUrl: url,
            post: savedPost,
          }),
        );

        await queryRunner.manager.save(postImages);

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

  async update(
    id: number,
    member: Member,
    data: UpdatePostDto,
    newFiles: Array<Express.Multer.File> = [],
  ): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['images'],
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.memberId !== member.id) {
      throw new ForbiddenException('게시글 수정 권한이 없습니다.');
    }

    const uniqueDeleteImageIds = [
      ...new Set(data.deleteImageIds ? data.deleteImageIds : []),
    ];
    const imagesToDelete = post.images.filter((image) =>
      uniqueDeleteImageIds.includes(image.id),
    );

    if (uniqueDeleteImageIds.length !== imagesToDelete.length) {
      throw new BadRequestException(
        '삭제할 이미지 ID가 현재 게시글에 존재하지 않습니다.',
      );
    }

    const remainingImageCount = post.images.length - imagesToDelete.length;
    if (remainingImageCount + newFiles.length > MAX_POST_IMAGE_COUNT) {
      throw new BadRequestException(
        `이미지는 최대 ${MAX_POST_IMAGE_COUNT}개까지 유지할 수 있습니다.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const updatePayload: Partial<Post> = {};
      if (data.title !== undefined) {
        updatePayload.title = data.title;
      }
      if (data.content !== undefined) {
        updatePayload.content = data.content;
      }
      if (data.category !== undefined) {
        updatePayload.category = data.category;
      }

      if (Object.keys(updatePayload).length > 0) {
        await queryRunner.manager.update(Post, id, updatePayload);
      }

      if (imagesToDelete.length > 0) {
        await queryRunner.manager.delete(
          PostImage,
          imagesToDelete.map((image) => image.id),
        );
      }

      if (newFiles.length > 0) {
        const uploadedUrls = await this.awsService.uploadFiles(
          newFiles,
          'posts',
        );
        const newImages = uploadedUrls.map((imageUrl) =>
          queryRunner.manager.create(PostImage, {
            postId: id,
            imageUrl,
          }),
        );
        await queryRunner.manager.save(PostImage, newImages);
      }

      const latestImages = await queryRunner.manager.find(PostImage, {
        where: { postId: id },
        order: { id: 'ASC' },
      });

      await queryRunner.manager.update(Post, id, {
        thumbnailUrl: latestImages[0] ? latestImages[0].imageUrl : null,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (data.hashTag !== undefined) {
      await this.tagService.syncTags(
        post,
        this.normalizeHashTags(data.hashTag),
      );
    }

    if (imagesToDelete.length > 0) {
      await Promise.allSettled(
        imagesToDelete.map((image) =>
          this.awsService.deleteFile(image.imageUrl),
        ),
      );
    }

    return this.findOne(id);
  }

  async remove(id: number, member: Member): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id },
      select: ['id', 'memberId'],
    });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    if (post.memberId !== member.id) {
      throw new ForbiddenException('게시글 삭제 권한이 없습니다.');
    }

    await this.postRepository.delete(id);
  }

  private normalizeHashTags(tags: string[]): string[] {
    return tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  }
}
