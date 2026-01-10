import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from './post.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post } from '../entities/post.entity';
import { PostImage } from '../entities/post-image.entity';
import { AwsService } from '../common/aws/aws.service';
import { TagService } from '../tag/tag.service';
import { LikeService } from '../like/like.service';
import { ReviewService } from '../review/review.service';
import { MemberService } from '../member/member.service';
import { DataSource } from 'typeorm';

describe('PostService', () => {
  let service: PostService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockAwsService = {
    uploadFiles: jest.fn(),
  };

  const mockTagService = {
    // defined methods if needed
  };

  const mockLikeService = {};
  const mockReviewService = {};
  const mockMemberService = {};

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: getRepositoryToken(Post),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PostImage),
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
        {
          provide: LikeService,
          useValue: mockLikeService,
        },
        {
          provide: ReviewService,
          useValue: mockReviewService,
        },
        {
          provide: MemberService,
          useValue: mockMemberService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
