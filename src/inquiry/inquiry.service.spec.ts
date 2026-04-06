import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InquiryCategory, InquiryStatus, MemberRole } from '../common/enums';
import { AwsService } from '../common/aws/aws.service';
import { InquiryImage } from '../entities/inquiry-image.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { Member } from '../entities/member.entity';
import { InquiryService } from './inquiry.service';

describe('InquiryService', () => {
  let service: InquiryService;

  let inquiryRepository: any;
  let inquiryImageRepository: any;
  let awsService: any;

  beforeEach(async () => {
    inquiryRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      createQueryBuilder: jest.fn(),
    };
    inquiryImageRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    awsService = {
      uploadFiles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiryService,
        {
          provide: getRepositoryToken(Inquiry),
          useValue: inquiryRepository,
        },
        {
          provide: getRepositoryToken(InquiryImage),
          useValue: inquiryImageRepository,
        },
        {
          provide: AwsService,
          useValue: awsService,
        },
      ],
    }).compile();

    service = module.get<InquiryService>(InquiryService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('관리자가 아니면 문의 관리자 목록을 조회할 수 없어야 한다', async () => {
    await expect(
      service.findAllForAdmin({ role: MemberRole.ROLE_MEMBER } as Member, {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('관리자 필터 조건을 반영해 문의 목록을 조회한다', async () => {
    const queryBuilder = createQueryBuilderMock([
      {
        id: 1,
        category: InquiryCategory.ACCOUNT,
        title: '로그인이 되지 않아요',
        content: '상세 문의 내용입니다.',
        status: InquiryStatus.PENDING,
        answer: null,
        createdAt: new Date('2026-04-06T00:00:00.000Z'),
        answeredAt: null,
        memberId: 10,
        member: {
          id: 10,
          nickname: '그림좋아',
          email: 'user@example.com',
          profile: {
            profileUrl: 'https://cdn.example.com/profile.png',
          },
        },
        images: [
          {
            imageUrl: 'https://example.com/inquiry/image-1.png',
          },
        ],
      },
    ]);
    inquiryRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAllForAdmin(
      { role: MemberRole.ROLE_ADMIN } as Member,
      {
        status: InquiryStatus.PENDING,
        category: InquiryCategory.ACCOUNT,
        keyword: '로그인',
      },
    );

    expect(inquiryRepository.createQueryBuilder).toHaveBeenCalledWith(
      'inquiry',
    );
    expect(queryBuilder.andWhere).toHaveBeenCalled();
    expect(result[0].memberNickname).toBe('그림좋아');
  });
});

function createQueryBuilderMock(result: any[]) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}
