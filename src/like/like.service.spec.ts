import { Test, TestingModule } from '@nestjs/testing';
import { LikeService } from './like.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LikeEntity } from '../entities/like-entity.entity';

describe('LikeService', () => {
  let service: LikeService;

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
