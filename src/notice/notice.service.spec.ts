import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemberRole } from '../common/enums';
import { Notice } from '../entities/notice.entity';
import { Member } from '../entities/member.entity';
import { NoticeService } from './notice.service';

describe('NoticeService', () => {
  let service: NoticeService;

  let noticeRepository: any;

  beforeEach(async () => {
    noticeRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      remove: jest.fn(async (data) => data),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoticeService,
        {
          provide: getRepositoryToken(Notice),
          useValue: noticeRepository,
        },
      ],
    }).compile();

    service = module.get<NoticeService>(NoticeService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('관리자가 아니면 공지 관리자 목록을 조회할 수 없어야 한다', async () => {
    await expect(
      service.findAllForAdmin({ role: MemberRole.ROLE_MEMBER } as Member, {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('관리자 필터 조건을 반영해 공지 목록을 조회한다', async () => {
    const queryBuilder = createQueryBuilderMock([
      {
        id: 1,
        adminId: 10,
        title: '서비스 점검 안내',
        content: '점검이 예정되어 있습니다.',
        createdAt: new Date('2026-04-06T00:00:00.000Z'),
        admin: {
          id: 10,
          nickname: '관리자',
          email: 'admin@example.com',
          profile: {
            profileUrl: 'https://cdn.example.com/admin.png',
          },
        },
      },
    ]);
    noticeRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAllForAdmin(
      { role: MemberRole.ROLE_ADMIN } as Member,
      { keyword: '점검' },
    );

    expect(noticeRepository.createQueryBuilder).toHaveBeenCalledWith('notice');
    expect(queryBuilder.andWhere).toHaveBeenCalled();
    expect(result[0].adminNickname).toBe('관리자');
  });

  it('없는 공지 조회 시 NotFoundException을 던져야 한다', async () => {
    noticeRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
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
