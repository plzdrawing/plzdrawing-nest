import { Test, TestingModule } from '@nestjs/testing';
import { ScrapController } from './scrap.controller';
import { ScrapService } from './scrap.service';

describe('ScrapController', () => {
  let controller: ScrapController;

  const mockScrapService = {
    scrapPost: jest.fn(),
    unscrapPost: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScrapController],
      providers: [
        {
          provide: ScrapService,
          useValue: mockScrapService,
        },
      ],
    }).compile();

    controller = module.get<ScrapController>(ScrapController);
  });

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });

  it('scrapPost는 사용자/게시글 ID를 서비스에 위임한다', async () => {
    mockScrapService.scrapPost.mockResolvedValue({ postId: 5, scrapped: true });
    const member = { id: 10 };

    await expect(controller.scrapPost(member as any, '5')).resolves.toEqual({
      postId: 5,
      scrapped: true,
    });
    expect(mockScrapService.scrapPost).toHaveBeenCalledWith(10, 5);
  });

  it('unscrapPost는 사용자/게시글 ID를 서비스에 위임한다', async () => {
    mockScrapService.unscrapPost.mockResolvedValue({
      postId: 5,
      scrapped: false,
    });
    const member = { id: 10 };

    await expect(controller.unscrapPost(member as any, '5')).resolves.toEqual({
      postId: 5,
      scrapped: false,
    });
    expect(mockScrapService.unscrapPost).toHaveBeenCalledWith(10, 5);
  });
});
