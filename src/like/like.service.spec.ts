import { Test, TestingModule } from '@nestjs/testing';
import { LikeService } from './like.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LikeEntity } from '../entities/like-entity.entity';

describe('LikeService', () => {
  let service: LikeService;
  let mockQueryBuilder: any;
  let mockRepository: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikeService,
        {
          provide: getRepositoryToken(LikeEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LikeService>(LikeService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('contentIds가 비어있으면 빈 Map을 반환한다', async () => {
    const result = await service.countLikesByContentIds([]);

    expect(result.size).toBe(0);
    expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('쿼리 결과를 숫자 Map으로 변환한다', async () => {
    mockQueryBuilder.getRawMany.mockResolvedValue([
      { contentId: '10', count: '3' },
      { contentId: '20', count: '7' },
    ]);

    const result = await service.countLikesByContentIds([10, 20]);

    expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('like');
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'post.id IN (:...contentIds)',
      { contentIds: [10, 20] },
    );
    expect(result.get(10)).toBe(3);
    expect(result.get(20)).toBe(7);
  });
});
