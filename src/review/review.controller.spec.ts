import { Test, TestingModule } from '@nestjs/testing';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

describe('ReviewController', () => {
  let controller: ReviewController;

  const mockReviewService = {
    getLatestReviews: jest.fn(),
    createReview: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: ReviewService, useValue: mockReviewService }],
    }).compile();

    controller = module.get<ReviewController>(ReviewController);
  });

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });

  it('getLatestReviews는 query/memberId를 서비스에 위임한다', async () => {
    const query = { page: 1, limit: 10, q: '친절', scrappedOnly: false };
    const member = { id: 7 };
    mockReviewService.getLatestReviews.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await expect(
      controller.getLatestReviews(member as any, query as any),
    ).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    expect(mockReviewService.getLatestReviews).toHaveBeenCalledWith(query, 7);
  });

  it('createReview는 member/dto를 서비스에 위임한다', async () => {
    const member = { id: 3 };
    const dto = { chatRoomId: 1, star: 'FIVE' };
    mockReviewService.createReview.mockResolvedValue({ id: 99 });

    await expect(
      controller.createReview(member as any, dto as any),
    ).resolves.toEqual({ id: 99 });
    expect(mockReviewService.createReview).toHaveBeenCalledWith(member, dto);
  });
});
