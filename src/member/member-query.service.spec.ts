import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemberQueryService } from './member-query.service';
import { Member } from '../entities/member.entity';
import { Post } from '../entities/post.entity';
import { Review } from '../entities/review.entity';
import { ReviewKeywordMap } from '../entities/review-keyword-map.entity';
import { ChatRoom } from '../entities/chat-room.entity';

describe('MemberQueryService', () => {
  let service: MemberQueryService;

  let memberRepository: any;
  let postRepository: any;
  let reviewRepository: any;
  let reviewKeywordMapRepository: any;
  let chatRoomRepository: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    memberRepository = {
      findOne: jest.fn(),
    };
    postRepository = {
      count: jest.fn(),
    };
    reviewRepository = {
      find: jest.fn(),
      findAndCount: jest.fn(),
    };
    reviewKeywordMapRepository = {
      find: jest.fn(),
    };
    chatRoomRepository = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberQueryService,
        { provide: getRepositoryToken(Member), useValue: memberRepository },
        { provide: getRepositoryToken(Post), useValue: postRepository },
        { provide: getRepositoryToken(Review), useValue: reviewRepository },
        {
          provide: getRepositoryToken(ReviewKeywordMap),
          useValue: reviewKeywordMapRepository,
        },
        { provide: getRepositoryToken(ChatRoom), useValue: chatRoomRepository },
      ],
    }).compile();

    service = module.get<MemberQueryService>(MemberQueryService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('활성 회원 프로필/태그 조회를 위임한다', async () => {
    memberRepository.findOne.mockResolvedValue({ id: 1 });

    await expect(
      service.findActiveMemberWithProfileAndTags(1),
    ).resolves.toEqual({ id: 1 });
    expect(memberRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 1 }),
        relations: ['profile', 'memberTags', 'memberTags.tag'],
      }),
    );
  });

  it('existsActiveMember는 존재 여부를 boolean으로 반환한다', async () => {
    memberRepository.findOne.mockResolvedValueOnce({ id: 10 });
    await expect(service.existsActiveMember(10)).resolves.toBe(true);

    memberRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.existsActiveMember(20)).resolves.toBe(false);
  });

  it('findKeywordMapsByReviewIds는 빈 입력이면 조회하지 않는다', async () => {
    await expect(service.findKeywordMapsByReviewIds([])).resolves.toEqual([]);
    expect(reviewKeywordMapRepository.find).not.toHaveBeenCalled();
  });

  it('findPublicReviews는 페이지네이션 조건으로 조회한다', async () => {
    reviewRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findPublicReviews(3, 2, 5);

    expect(reviewRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { receiverId: 3 },
        skip: 5,
        take: 5,
      }),
    );
  });
});
