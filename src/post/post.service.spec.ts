import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from './post.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post } from '../entities/post.entity';
import { PostImage } from '../entities/post-image.entity';
import { AwsService } from '../common/aws/aws.service';
import { TagService } from '../tag/tag.service';
import { LikeService } from '../like/like.service';
import { ReviewService } from '../review/review.service';
import { MemberService } from '../member/member.service';
import { DataSource } from 'typeorm';
import { PostFeedQueryRepository } from './query/post-feed.query.repository';
import { PostFeedMapper } from './mapper/post-feed.mapper';
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

describe('PostService', () => {
  let service: PostService;

  let postRepository: any;
  let postImageRepository: any;
  let awsService: any;
  let tagService: any;
  let likeService: any;
  let reviewService: any;
  let memberService: any;
  let postFeedQueryRepository: any;
  let dataSource: any;
  let queryRunner: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    postRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    postImageRepository = {};
    awsService = {
      uploadFiles: jest.fn(),
    };
    tagService = {
      findTagsByContentIds: jest.fn(),
      syncTags: jest.fn(),
    };
    likeService = {
      countLikesByContentIds: jest.fn(),
    };
    reviewService = {
      findSellingMemberStats: jest.fn(),
    };
    memberService = {
      findProfileImageUrlByMemberIds: jest.fn(),
    };
    postFeedQueryRepository = {
      findLatestPosts: jest.fn(),
      countDrawingsByMemberIds: jest.fn(),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn((_: any, data: any) => ({ ...data })),
        save: jest.fn(),
      },
    };
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: getRepositoryToken(Post), useValue: postRepository },
        {
          provide: getRepositoryToken(PostImage),
          useValue: postImageRepository,
        },
        { provide: AwsService, useValue: awsService },
        { provide: TagService, useValue: tagService },
        { provide: LikeService, useValue: likeService },
        { provide: ReviewService, useValue: reviewService },
        { provide: MemberService, useValue: memberService },
        {
          provide: PostFeedQueryRepository,
          useValue: postFeedQueryRepository,
        },
        PostFeedMapper,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('이미지 없이 게시글 생성 후 상세 조회 결과를 반환한다', async () => {
      queryRunner.manager.save.mockResolvedValueOnce({ id: 101 });
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ id: 101 } as any);

      const result = await service.create(
        { id: 1 } as any,
        { content: 'hello' } as any,
        [],
      );

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.create).toHaveBeenCalledWith(Post, {
        content: 'hello',
        member: { id: 1 },
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(findOneSpy).toHaveBeenCalledWith(101);
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({ id: 101 });
    });

    it('이미지가 있으면 업로드/썸네일 저장까지 처리한다', async () => {
      const savedPost = { id: 201 };
      queryRunner.manager.save
        .mockResolvedValueOnce(savedPost)
        .mockResolvedValueOnce([{ imageUrl: 'u1' }, { imageUrl: 'u2' }])
        .mockResolvedValueOnce({ ...savedPost, thumbnailUrl: 'u1' });
      awsService.uploadFiles.mockResolvedValue(['u1', 'u2']);
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 201 } as any);

      await service.create(
        { id: 2 } as any,
        { content: 'with images' } as any,
        [{ originalname: 'a.png' }, { originalname: 'b.png' }] as any,
      );

      expect(awsService.uploadFiles).toHaveBeenCalledWith(
        expect.any(Array),
        'posts',
      );
      expect(queryRunner.manager.save).toHaveBeenCalledTimes(3);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('생성 중 오류가 나면 rollback 후 예외를 다시 던진다', async () => {
      const error = new Error('db fail');
      queryRunner.manager.save.mockRejectedValue(error);

      await expect(
        service.create({ id: 1 } as any, { content: 'x' } as any),
      ).rejects.toThrow(error);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('hashTag가 있으면 생성 후 syncTags를 호출한다', async () => {
      queryRunner.manager.save.mockResolvedValueOnce({ id: 301 });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 301 } as any);

      await service.create(
        { id: 1 } as any,
        { content: 'hello', hashTag: ['고양이', ' 캐릭터 '] } as any,
        [],
      );

      expect(tagService.syncTags).toHaveBeenCalledWith(
        expect.objectContaining({ id: 301 }),
        ['고양이', '캐릭터'],
      );
    });
  });

  it('findAll은 페이지네이션으로 조회한다', async () => {
    postRepository.findAndCount.mockResolvedValue([[{ id: 1 }], 1]);

    await expect(
      service.findAll({ page: 2, limit: 5 } as any),
    ).resolves.toEqual({
      data: [{ id: 1 }],
      total: 1,
      page: 2,
      limit: 5,
    });
    expect(postRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      }),
    );
  });

  it('findByMember는 memberId 조건으로 조회한다', async () => {
    postRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findByMember(9, { page: 1, limit: 10 } as any);

    expect(postRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberId: 9 },
      }),
    );
  });

  describe('getLatestContents', () => {
    it('게시글이 없으면 빈 결과를 반환한다', async () => {
      postFeedQueryRepository.findLatestPosts.mockResolvedValue({
        posts: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await expect(
        service.getLatestContents({ page: 1, limit: 10 } as any),
      ).resolves.toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });

    it('집계 맵을 이용해 LatestContentsResponse 목록으로 매핑한다', async () => {
      const now = new Date('2024-01-01T00:00:00Z');
      postFeedQueryRepository.findLatestPosts.mockResolvedValue({
        posts: [
          {
            id: 1,
            memberId: 100,
            createdAt: now,
            content: 'p1',
            category: 'DRAWING',
            timeTaken: '10분',
            price: 12000,
            images: [{ imageUrl: 'img1' }],
            member: { nickname: 'seller1' },
          },
          {
            id: 2,
            memberId: 200,
            createdAt: now,
            content: 'p2',
            category: null,
            timeTaken: null,
            price: null,
            images: [{ imageUrl: 'img2a' }, { imageUrl: 'img2b' }],
            member: { nickname: 'seller2' },
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
      });
      tagService.findTagsByContentIds.mockResolvedValue(
        new Map([
          [1, ['cat']],
          [2, ['dog']],
        ]),
      );
      likeService.countLikesByContentIds.mockResolvedValue(
        new Map([
          [1, 3],
          [2, 5],
        ]),
      );
      memberService.findProfileImageUrlByMemberIds.mockResolvedValue(
        new Map([
          [100, 'profile1'],
          [200, 'profile2'],
        ]),
      );
      jest
        .spyOn(service, 'countDrawingsByMemberIds')
        .mockResolvedValue(new Map([[100, 7]]));
      reviewService.findSellingMemberStats.mockResolvedValue(
        new Map([[100, { reviewCount: 4, star: 4.5 }]]),
      );

      const result = await service.getLatestContents({
        page: 1,
        limit: 10,
      } as any);

      expect(tagService.findTagsByContentIds).toHaveBeenCalledWith([1, 2]);
      expect(memberService.findProfileImageUrlByMemberIds).toHaveBeenCalledWith(
        [100, 200],
      );
      expect(result.total).toBe(2);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          uploader: expect.objectContaining({
            nickname: 'seller1',
            profileImageUrl: 'profile1',
            drawingCount: 7,
            reviewCount: 4,
            star: 4.5,
          }),
          contents: expect.objectContaining({
            contentId: 1,
            imageUrls: ['img1'],
            tags: ['cat'],
            explanation: 'p1',
            timeTaken: '10분',
            price: 12000,
            likeCount: 3,
          }),
        }),
      );
      expect(result.data[1]).toEqual(
        expect.objectContaining({
          uploader: expect.objectContaining({
            drawingCount: 0,
            reviewCount: 0,
            star: 0,
          }),
          contents: expect.objectContaining({
            contentId: 2,
            timeTaken: '',
            price: 0,
            likeCount: 5,
          }),
        }),
      );
    });

    it('scrappedOnly=true인데 memberId가 없으면 UnauthorizedException을 던진다', async () => {
      await expect(
        service.getLatestContents({
          page: 1,
          limit: 10,
          scrappedOnly: true,
        } as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(postFeedQueryRepository.findLatestPosts).not.toHaveBeenCalled();
    });

    it('scrappedOnly=true면 query repository에 memberId를 전달한다', async () => {
      postFeedQueryRepository.findLatestPosts.mockResolvedValue({
        posts: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await service.getLatestContents(
        { page: 1, limit: 10, scrappedOnly: true } as any,
        123,
      );

      expect(postFeedQueryRepository.findLatestPosts).toHaveBeenCalledWith(
        { page: 1, limit: 10, scrappedOnly: true },
        123,
      );
    });

    it('q가 있으면 query repository에 그대로 전달한다', async () => {
      postFeedQueryRepository.findLatestPosts.mockResolvedValue({
        posts: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await service.getLatestContents(
        { page: 1, limit: 10, q: '  고양이  ' } as any,
        1,
      );

      expect(postFeedQueryRepository.findLatestPosts).toHaveBeenCalledWith(
        { page: 1, limit: 10, q: '  고양이  ' },
        1,
      );
    });
  });

  describe('getMemberContents', () => {
    it('게시글이 없으면 빈 결과를 반환한다', async () => {
      postRepository.findAndCount.mockResolvedValue([[], 0]);

      await expect(
        service.getMemberContents(1, { page: 1, limit: 10 } as any),
      ).resolves.toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });

    it('게시글 목록을 ContentsDto로 매핑한다', async () => {
      const now = new Date('2024-01-01T00:00:00Z');
      postRepository.findAndCount.mockResolvedValue([
        [
          {
            id: 11,
            createdAt: now,
            images: [{ imageUrl: 'u1' }, { imageUrl: 'u2' }],
            content: 'desc',
            timeTaken: '1시간',
            price: 4500,
          },
        ],
        1,
      ]);
      tagService.findTagsByContentIds.mockResolvedValue(
        new Map([[11, ['tag1']]]),
      );
      likeService.countLikesByContentIds.mockResolvedValue(new Map([[11, 2]]));

      const result = await service.getMemberContents(1, {
        page: 2,
        limit: 3,
      } as any);

      expect(result).toEqual({
        data: [
          expect.objectContaining({
            contentId: 11,
            imageUrls: ['u1', 'u2'],
            tags: ['tag1'],
            explanation: 'desc',
            timeTaken: '1시간',
            price: 4500,
            likeCount: 2,
          }),
        ],
        total: 1,
        page: 2,
        limit: 3,
      });
    });
  });

  describe('countDrawingsByMemberIds', () => {
    it('query repository로 위임한다', async () => {
      const map = new Map<number, number>([
        [100, 4],
        [200, 8],
      ]);
      postFeedQueryRepository.countDrawingsByMemberIds.mockResolvedValue(map);

      const result = await service.countDrawingsByMemberIds([100, 200]);

      expect(
        postFeedQueryRepository.countDrawingsByMemberIds,
      ).toHaveBeenCalledWith([100, 200]);
      expect(result).toBe(map);
    });
  });

  describe('findOne/update/remove', () => {
    it('findOne은 게시글이 없으면 NotFoundException을 던진다', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('findOne은 게시글 상세를 반환한다', async () => {
      postRepository.findOne.mockResolvedValue({ id: 1 });

      await expect(service.findOne(1)).resolves.toEqual({ id: 1 });
    });

    it('update는 저장 후 상세를 반환하고 remove는 삭제를 위임한다', async () => {
      postRepository.findOne.mockResolvedValue({ id: 7, content: 'updated' });

      await expect(service.update(7, { content: 'updated' })).resolves.toEqual({
        id: 7,
        content: 'updated',
      });
      expect(postRepository.update).toHaveBeenCalledWith(7, {
        content: 'updated',
      });

      await service.remove(7);
      expect(postRepository.delete).toHaveBeenCalledWith(7);
    });
  });

  describe('updateByOwner/removeByOwner', () => {
    it('작성자가 아니면 updateByOwner는 ForbiddenException을 던진다', async () => {
      postRepository.findOne.mockResolvedValue({ id: 1, memberId: 10 });

      await expect(
        service.updateByOwner(1, { id: 99 } as any, { content: 'x' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('작성자가 아니면 removeByOwner는 ForbiddenException을 던진다', async () => {
      postRepository.findOne.mockResolvedValue({ id: 1, memberId: 10 });

      await expect(service.removeByOwner(1, { id: 99 } as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('작성자면 updateByOwner/removeByOwner가 수행된다', async () => {
      postRepository.findOne.mockResolvedValue({ id: 5, memberId: 20 });
      const updateSpy = jest
        .spyOn(service, 'update')
        .mockResolvedValue({ id: 5 } as any);

      await expect(
        service.updateByOwner(5, { id: 20 } as any, { content: 'ok' } as any),
      ).resolves.toEqual({ id: 5 });
      expect(updateSpy).toHaveBeenCalledWith(5, { content: 'ok' });

      await service.removeByOwner(5, { id: 20 } as any);
      expect(postRepository.delete).toHaveBeenCalledWith(5);
    });
  });
});
