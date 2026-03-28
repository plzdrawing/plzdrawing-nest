import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Review } from '../entities/review.entity';
import { ReviewStar } from '../common/enums';
import { ReviewKeyword } from '../entities/review-keyword.entity';
import { ReviewKeywordMap } from '../entities/review-keyword-map.entity';
import { ChatRoom } from '../entities/chat-room.entity';
import { Message } from '../entities/message.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('ReviewService', () => {
  let service: ReviewService;
  let latestQb: any;

  const reviewRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const reviewKeywordRepository = {
    find: jest.fn(),
  };
  const reviewKeywordMapRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const chatRoomRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const messageRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    latestQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    reviewRepository.createQueryBuilder.mockReturnValue(latestQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: getRepositoryToken(Review),
          useValue: reviewRepository,
        },
        {
          provide: getRepositoryToken(ReviewKeyword),
          useValue: reviewKeywordRepository,
        },
        {
          provide: getRepositoryToken(ReviewKeywordMap),
          useValue: reviewKeywordMapRepository,
        },
        {
          provide: getRepositoryToken(ChatRoom),
          useValue: chatRoomRepository,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: messageRepository,
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('memberIds가 비어있으면 빈 Map을 반환한다', async () => {
    const result = await service.findSellingMemberStats([]);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
    expect(reviewRepository.find).not.toHaveBeenCalled();
  });

  it('리뷰를 receiverId별로 집계하고 평균 별점을 계산한다', async () => {
    reviewRepository.find.mockResolvedValue([
      { receiverId: 1, star: ReviewStar.FIVE },
      { receiverId: 1, star: ReviewStar.THREE },
      { receiverId: 2, star: ReviewStar.ONE },
      { receiverId: 2, star: 'UNKNOWN' },
    ]);

    const result = await service.findSellingMemberStats([1, 2]);

    expect(reviewRepository.find).toHaveBeenCalled();
    expect(result.get(1)).toEqual({ reviewCount: 2, star: 4 });
    expect(result.get(2)).toEqual({ reviewCount: 2, star: 0.5 });
  });

  describe('getLatestReviews', () => {
    it('리뷰가 없으면 빈 페이지 응답을 반환한다', async () => {
      latestQb.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(
        service.getLatestReviews({ page: 1, limit: 10 } as any),
      ).resolves.toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });

    it('리뷰 목록을 ReviewListItemDto 형식으로 매핑한다', async () => {
      const now = new Date('2024-01-01T00:00:00Z');
      latestQb.getManyAndCount.mockResolvedValue([
        [
          {
            id: 1,
            postId: 11,
            writerId: 3,
            writer: { nickname: '리뷰어' },
            star: ReviewStar.FIVE,
            content: '아주 만족!',
            imageObjectKeys: ['review/1/2026/03/a.jpg'],
            createdAt: now,
            reviewKeywordMaps: [
              { keyword: { keyword: '친절해요' } },
              { keyword: { keyword: '섬세해요' } },
              { keyword: { keyword: '친절해요' } },
            ],
          },
        ],
        1,
      ]);

      const result = await service.getLatestReviews({
        page: 1,
        limit: 10,
      } as any);

      expect(result.total).toBe(1);
      expect(result.data[0]).toEqual({
        reviewId: 1,
        postId: 11,
        writerId: 3,
        writerNickname: '리뷰어',
        star: ReviewStar.FIVE,
        content: '아주 만족!',
        keywords: ['친절해요', '섬세해요'],
        imageObjectKeys: ['review/1/2026/03/a.jpg'],
        createdAt: now,
      });
    });

    it('scrappedOnly=true인데 memberId가 없으면 UnauthorizedException을 던진다', async () => {
      await expect(
        service.getLatestReviews({
          page: 1,
          limit: 10,
          scrappedOnly: true,
        } as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(latestQb.innerJoin).not.toHaveBeenCalled();
    });

    it('scrappedOnly=true면 scrap inner join을 적용한다', async () => {
      latestQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getLatestReviews(
        { page: 1, limit: 10, scrappedOnly: true } as any,
        99,
      );

      expect(latestQb.innerJoin).toHaveBeenCalledWith(
        'post.scraps',
        'scrap',
        'scrap.memberId = :memberId',
        { memberId: 99 },
      );
    });

    it('q가 있으면 검색 조건을 추가한다', async () => {
      latestQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getLatestReviews(
        { page: 1, limit: 10, q: '친절' } as any,
        1,
      );

      expect(latestQb.andWhere).toHaveBeenCalled();
    });
  });
});
