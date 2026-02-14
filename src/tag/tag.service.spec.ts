import { Test, TestingModule } from '@nestjs/testing';
import { TagService } from './tag.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag } from '../entities/tag.entity';
import { PostTag } from '../entities/post-tag.entity';
import { MemberTag } from '../entities/member-tag.entity';

describe('TagService', () => {
  let service: TagService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PostTag),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(MemberTag),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });
});
