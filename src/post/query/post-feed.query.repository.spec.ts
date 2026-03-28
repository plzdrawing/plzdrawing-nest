import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PostFeedQueryRepository } from './post-feed.query.repository';
import { Post } from '../../entities/post.entity';

describe('PostFeedQueryRepository', () => {
  let repository: PostFeedQueryRepository;
  let postRepository: any;

  beforeEach(async () => {
    postRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostFeedQueryRepository,
        { provide: getRepositoryToken(Post), useValue: postRepository },
      ],
    }).compile();

    repository = module.get<PostFeedQueryRepository>(PostFeedQueryRepository);
  });

  it('정의되어 있어야 한다', () => {
    expect(repository).toBeDefined();
  });

  describe('findLatestPosts', () => {
    it('검색/정렬/페이지네이션을 적용해 목록을 반환한다', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      };
      postRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.findLatestPosts(
        { page: 2, limit: 5, q: '고양이' } as any,
        10,
      );

      expect(postRepository.createQueryBuilder).toHaveBeenCalledWith('post');
      expect(qb.andWhere).toHaveBeenCalled();
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        posts: [{ id: 1 }],
        total: 1,
        page: 2,
        limit: 5,
      });
    });

    it('scrappedOnly=true면 scrap inner join을 추가한다', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      postRepository.createQueryBuilder.mockReturnValue(qb);

      await repository.findLatestPosts(
        { page: 1, limit: 10, scrappedOnly: true } as any,
        77,
      );

      expect(qb.innerJoin).toHaveBeenCalledWith(
        'post.scraps',
        'scrap',
        'scrap.memberId = :memberId',
        { memberId: 77 },
      );
    });
  });

  describe('countDrawingsByMemberIds', () => {
    it('memberIds가 비어 있으면 빈 Map을 반환한다', async () => {
      const result = await repository.countDrawingsByMemberIds([]);

      expect(result.size).toBe(0);
      expect(postRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('쿼리 결과를 숫자 Map으로 변환한다', async () => {
      const countQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { memberId: '100', count: '4' },
          { memberId: '200', count: '8' },
        ]),
      };
      postRepository.createQueryBuilder.mockReturnValue(countQb);

      const result = await repository.countDrawingsByMemberIds([100, 200]);

      expect(postRepository.createQueryBuilder).toHaveBeenCalledWith('post');
      expect(result.get(100)).toBe(4);
      expect(result.get(200)).toBe(8);
    });
  });
});
