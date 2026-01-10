import { Test, TestingModule } from '@nestjs/testing';
import { MemberService } from './member.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Member } from '../entities/member.entity';
import { Profile } from '../entities/profile.entity';
import { AwsService } from '../common/aws/aws.service';
import { TagService } from '../tag/tag.service';

describe('MemberService', () => {
  let service: MemberService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockAwsService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockTagService = {
    syncMemberTags: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        {
          provide: getRepositoryToken(Member),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: mockRepository,
        },
        {
          provide: AwsService,
          useValue: mockAwsService,
        },
        {
          provide: TagService,
          useValue: mockTagService,
        },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
