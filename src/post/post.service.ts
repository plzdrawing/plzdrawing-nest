import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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
import { UploaderDto } from './dto/uploader.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const MAX_POST_IMAGE_COUNT = 3;

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

        // 첫 번째 이미지를 썸네일로 설정
        savedPost.thumbnailUrl = imageUrls[0];
        await queryRunner.manager.save(savedPost);
      }

      await queryRunner.commitTransaction();
      if (hashTag !== undefined) {
        await this.tagService.syncTags(savedPost, hashTag);
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

  async getLatestContents(paginationDto: PaginationDto): Promise<{
    data: LatestContentsResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const [posts, total] = await this.postRepository.findAndCount({
      relations: ['member', 'images'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

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
      await this.tagService.syncTags(post, data.hashTag);
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
}
