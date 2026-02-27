import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Review } from '../entities/review.entity';
import { ReviewStar } from '../common/enums';

describe('ReviewService', () => {
  let service: ReviewService;

  const mockRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: getRepositoryToken(Review),
          useValue: mockRepository,
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
    expect(mockRepository.find).not.toHaveBeenCalled();
  });

  it('리뷰를 receiverId별로 집계하고 평균 별점을 계산한다', async () => {
    mockRepository.find.mockResolvedValue([
      { receiverId: 1, star: ReviewStar.FIVE },
      { receiverId: 1, star: ReviewStar.THREE },
      { receiverId: 2, star: ReviewStar.ONE },
      { receiverId: 2, star: 'UNKNOWN' },
    ]);

    const result = await service.findSellingMemberStats([1, 2]);

    expect(mockRepository.find).toHaveBeenCalled();
    expect(result.get(1)).toEqual({ reviewCount: 2, star: 4 });
    expect(result.get(2)).toEqual({ reviewCount: 2, star: 0.5 });
  });
});
