import { Test, TestingModule } from '@nestjs/testing';
import { TagService } from './tag.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag } from '../entities/tag.entity';
import { PostTag } from '../entities/post-tag.entity';
import { MemberTag } from '../entities/member-tag.entity';
import { TagStatus } from '../common/enums';

describe('TagService', () => {
  let service: TagService;

  let tagRepository: any;
  let postTagRepository: any;
  let memberTagRepository: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    tagRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => data),
    };
    postTagRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => data),
      update: jest.fn(),
    };
    memberTagRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => data),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        {
          provide: getRepositoryToken(Tag),
          useValue: tagRepository,
        },
        {
          provide: getRepositoryToken(PostTag),
          useValue: postTagRepository,
        },
        {
          provide: getRepositoryToken(MemberTag),
          useValue: memberTagRepository,
        },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('syncTags', () => {
    it('태그명이 없으면 기존 ACTIVE 태그를 모두 INACTIVE로 변경한다', async () => {
      await service.syncTags({ id: 1 } as any, []);

      expect(postTagRepository.update).toHaveBeenCalledWith(
        { postId: 1, status: TagStatus.ACTIVE },
        { status: TagStatus.INACTIVE },
      );
      expect(tagRepository.find).not.toHaveBeenCalled();
    });

    it('태그를 정규화하고 신규 연결/재활성화/비활성화를 처리한다', async () => {
      tagRepository.find.mockResolvedValue([{ id: 10, name: 'cat' }]);
      tagRepository.save.mockResolvedValue([
        { id: 20, name: 'dog', status: TagStatus.ACTIVE },
      ]);

      postTagRepository.find
        .mockResolvedValueOnce([
          { id: 100, postId: 1, tagId: 10, status: TagStatus.INACTIVE },
        ])
        .mockResolvedValueOnce([
          { id: 100, postId: 1, tagId: 10, status: TagStatus.ACTIVE },
          { id: 101, postId: 1, tagId: 20, status: TagStatus.ACTIVE },
          { id: 102, postId: 1, tagId: 999, status: TagStatus.ACTIVE },
        ]);

      await service.syncTags({ id: 1 } as any, ['Cat', 'DOG', 'cat']);

      expect(tagRepository.find).toHaveBeenCalledTimes(1);
      expect(tagRepository.create).toHaveBeenCalledWith({
        name: 'dog',
        status: TagStatus.ACTIVE,
      });
      expect(postTagRepository.create).toHaveBeenCalledWith({
        postId: 1,
        tagId: 20,
        status: TagStatus.ACTIVE,
      });
      expect(postTagRepository.save).toHaveBeenCalledWith([
        { postId: 1, tagId: 20, status: TagStatus.ACTIVE },
      ]);
      expect(postTagRepository.update).toHaveBeenCalledTimes(2);
      expect(postTagRepository.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: expect.anything() }),
        { status: TagStatus.ACTIVE },
      );
      expect(postTagRepository.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: expect.anything() }),
        { status: TagStatus.INACTIVE },
      );
    });

    it('신규/상태 변경이 없으면 불필요한 save/update를 호출하지 않는다', async () => {
      tagRepository.find.mockResolvedValue([
        { id: 10, name: 'cat' },
        { id: 20, name: 'dog' },
      ]);

      postTagRepository.find
        .mockResolvedValueOnce([
          { id: 100, postId: 1, tagId: 10, status: TagStatus.ACTIVE },
          { id: 101, postId: 1, tagId: 20, status: TagStatus.ACTIVE },
        ])
        .mockResolvedValueOnce([
          { id: 100, postId: 1, tagId: 10, status: TagStatus.ACTIVE },
          { id: 101, postId: 1, tagId: 20, status: TagStatus.ACTIVE },
        ]);

      await service.syncTags({ id: 1 } as any, ['cat', 'dog']);

      expect(tagRepository.save).not.toHaveBeenCalled();
      expect(postTagRepository.save).not.toHaveBeenCalled();
      expect(postTagRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('syncMemberTags', () => {
    it('태그명이 없으면 기존 ACTIVE 멤버 태그를 비활성화한다', async () => {
      await service.syncMemberTags({ id: 3 } as any, []);

      expect(memberTagRepository.update).toHaveBeenCalledWith(
        { memberId: 3, status: TagStatus.ACTIVE },
        { status: TagStatus.INACTIVE },
      );
    });

    it('신규/재활성화/비활성화 흐름을 처리한다', async () => {
      tagRepository.find.mockResolvedValue([{ id: 1, name: 'a' }]);
      tagRepository.save.mockResolvedValue([{ id: 2, name: 'b' }]);

      memberTagRepository.find
        .mockResolvedValueOnce([
          { id: 11, memberId: 7, tagId: 1, status: TagStatus.INACTIVE },
        ])
        .mockResolvedValueOnce([
          { id: 11, memberId: 7, tagId: 1, status: TagStatus.ACTIVE },
          { id: 12, memberId: 7, tagId: 2, status: TagStatus.ACTIVE },
          { id: 13, memberId: 7, tagId: 99, status: TagStatus.ACTIVE },
        ]);

      await service.syncMemberTags({ id: 7 } as any, ['A', 'b']);

      expect(memberTagRepository.create).toHaveBeenCalledWith({
        memberId: 7,
        tagId: 2,
        status: TagStatus.ACTIVE,
      });
      expect(memberTagRepository.save).toHaveBeenCalledWith([
        { memberId: 7, tagId: 2, status: TagStatus.ACTIVE },
      ]);
      expect(memberTagRepository.update).toHaveBeenCalledTimes(2);
      expect(memberTagRepository.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: expect.anything() }),
        { status: TagStatus.ACTIVE },
      );
      expect(memberTagRepository.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: expect.anything() }),
        { status: TagStatus.INACTIVE },
      );
    });
  });

  describe('findTagsByContentIds', () => {
    it('postIds가 비어있으면 빈 Map을 반환한다', async () => {
      const result = await service.findTagsByContentIds([]);

      expect(result.size).toBe(0);
      expect(postTagRepository.find).not.toHaveBeenCalled();
    });

    it('게시글별 태그명을 그룹핑해서 반환하고 tag가 없으면 건너뛴다', async () => {
      postTagRepository.find.mockResolvedValue([
        { postId: 1, tag: { name: 'cat' } },
        { postId: 1, tag: { name: 'dog' } },
        { postId: 2, tag: { name: 'bird' } },
        { postId: 2, tag: null },
      ]);

      const result = await service.findTagsByContentIds([1, 2]);

      expect(postTagRepository.find).toHaveBeenCalled();
      expect(result.get(1)).toEqual(['cat', 'dog']);
      expect(result.get(2)).toEqual(['bird']);
    });
  });
});
