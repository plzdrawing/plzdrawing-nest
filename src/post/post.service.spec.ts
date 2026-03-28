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
import { NotFoundException } from '@nestjs/common';

describe('PostService', () => {
  let service: PostService;

  let postRepository: any;
  let postImageRepository: any;
  let awsService: any;
  let tagService: any;
  let likeService: any;
  let reviewService: any;
  let memberService: any;
  let dataSource: any;
  let queryRunner: any;
  let countQb: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    countQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    postRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(countQb),
    };
    postImageRepository = {};
    awsService = {
      uploadFiles: jest.fn(),
      deleteFile: jest.fn(),
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

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn((_: any, data: any) => ({ ...data })),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        find: jest.fn(),
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
      postRepository.findAndCount.mockResolvedValue([[], 0]);

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
      postRepository.findAndCount.mockResolvedValue([
        [
          {
            id: 1,
            memberId: 100,
            createdAt: now,
            content: 'p1',
            category: 'DRAWING',
            images: [{ imageUrl: 'img1' }],
            member: { nickname: 'seller1' },
          },
          {
            id: 2,
            memberId: 200,
            createdAt: now,
            content: 'p2',
            category: null,
            images: [{ imageUrl: 'img2a' }, { imageUrl: 'img2b' }],
            member: { nickname: 'seller2' },
          },
        ],
        2,
      ]);
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
            timeTaken: 'DRAWING',
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
            likeCount: 5,
          }),
        }),
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
            timeTaken: '',
            price: 0,
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
    it('memberIds가 비어있으면 빈 Map을 반환한다', async () => {
      const result = await service.countDrawingsByMemberIds([]);

      expect(result.size).toBe(0);
      expect(postRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('쿼리 결과를 숫자 Map으로 변환한다', async () => {
      countQb.getRawMany.mockResolvedValue([
        { memberId: '100', count: '4' },
        { memberId: '200', count: '8' },
      ]);

      const result = await service.countDrawingsByMemberIds([100, 200]);

      expect(postRepository.createQueryBuilder).toHaveBeenCalledWith('post');
      expect(countQb.where).toHaveBeenCalledWith(
        'post.member_id IN (:...memberIds)',
        { memberIds: [100, 200] },
      );
      expect(result.get(100)).toBe(4);
      expect(result.get(200)).toBe(8);
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

    it('update는 작성자 본인 요청이면 수정 후 상세를 반환한다', async () => {
      postRepository.findOne.mockResolvedValue({
        id: 7,
        memberId: 10,
        images: [],
      });
      queryRunner.manager.find.mockResolvedValue([]);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ id: 7, content: 'updated' } as any);

      await expect(
        service.update(7, { id: 10 } as any, { content: 'updated' } as any),
      ).resolves.toEqual({
        id: 7,
        content: 'updated',
      });

      expect(queryRunner.manager.update).toHaveBeenCalledWith(Post, 7, {
        content: 'updated',
      });
      expect(queryRunner.manager.update).toHaveBeenCalledWith(Post, 7, {
        thumbnailUrl: null,
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('update는 작성자가 아니면 예외를 던진다', async () => {
      postRepository.findOne.mockResolvedValue({
        id: 7,
        memberId: 10,
        images: [],
      });

      await expect(
        service.update(7, { id: 99 } as any, { content: 'updated' } as any),
      ).rejects.toThrow('게시글 수정 권한이 없습니다.');
    });

    it('update는 최종 이미지 개수가 3개를 넘으면 예외를 던진다', async () => {
      postRepository.findOne.mockResolvedValue({
        id: 7,
        memberId: 10,
        images: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      await expect(
        service.update(
          7,
          { id: 10 } as any,
          { content: 'updated' } as any,
          [{ originalname: '1.png' }] as any,
        ),
      ).rejects.toThrow('이미지는 최대 3개까지 유지할 수 있습니다.');
    });

    it('remove는 삭제를 위임한다', async () => {
      await service.remove(7);
      expect(postRepository.delete).toHaveBeenCalledWith(7);
    });
  });
});
