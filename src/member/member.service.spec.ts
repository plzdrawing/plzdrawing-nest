import { Test, TestingModule } from '@nestjs/testing';
import { MemberService } from './member.service';
import { MemberQueryService } from './member-query.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Member } from '../entities/member.entity';
import { Profile } from '../entities/profile.entity';
import { AwsService } from '../common/aws/aws.service';
import { TagService } from '../tag/tag.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  MemberRole,
  MemberStatus,
  ReviewStar,
  TagStatus,
} from '../common/enums';
import * as bcrypt from 'bcrypt';

describe('MemberService', () => {
  let service: MemberService;

  let memberRepository: any;
  let profileRepository: any;
  let memberQueryService: any;
  let awsService: any;
  let tagService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    memberRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    profileRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    memberQueryService = {
      findActiveMemberWithProfileAndTags: jest.fn(),
      existsActiveMember: jest.fn(),
      countMemberPosts: jest.fn(),
      findReceiverReviewStars: jest.fn(),
      countCompletedWorks: jest.fn(),
      findKeywordMapsByReviewIds: jest.fn(),
      findPublicReviews: jest.fn(),
    };
    awsService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    tagService = {
      syncMemberTags: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        {
          provide: getRepositoryToken(Member),
          useValue: memberRepository,
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: profileRepository,
        },
        {
          provide: AwsService,
          useValue: awsService,
        },
        {
          provide: TagService,
          useValue: tagService,
        },
        {
          provide: MemberQueryService,
          useValue: memberQueryService,
        },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('create는 기본 role/status를 넣어 저장한다', async () => {
    memberRepository.findOne.mockResolvedValue(null);
    memberRepository.save.mockImplementation(async (v: any) => v);

    const result = await service.create({
      email: 'A@test.com ',
      nickname: ' nick ',
    } as any);

    expect(memberRepository.create).toHaveBeenCalledWith({
      status: MemberStatus.ACTIVE,
      role: MemberRole.ROLE_MEMBER,
      email: 'a@test.com',
      nickname: 'nick',
    });
    expect(result).toMatchObject({
      email: 'a@test.com',
      nickname: 'nick',
      status: MemberStatus.ACTIVE,
      role: MemberRole.ROLE_MEMBER,
    });
  });

  it('create는 중복 이메일이면 ConflictException을 던진다', async () => {
    memberRepository.findOne.mockResolvedValueOnce({ id: 1 });

    await expect(
      service.create({ email: 'a@test.com' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('create는 중복 닉네임이면 ConflictException을 던진다', async () => {
    memberRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1 });

    await expect(
      service.create({ email: 'a@test.com', nickname: 'nick' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('findByEmail/findById/update는 repository에 위임한다', async () => {
    memberRepository.findOne
      .mockResolvedValueOnce({ id: 1, email: 'a@test.com' })
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce({ id: 3 });

    await expect(service.findByEmail(' A@test.com ')).resolves.toEqual({
      id: 1,
      email: 'a@test.com',
    });
    await expect(service.findById(2)).resolves.toEqual({ id: 2 });
    await expect(service.update(3, { nickname: 'n' })).resolves.toEqual({
      id: 3,
    });

    expect(memberRepository.findOne).toHaveBeenNthCalledWith(1, {
      where: { email: 'a@test.com' },
    });
    expect(memberRepository.update).toHaveBeenCalledWith(3, { nickname: 'n' });
  });

  it('findByEmail는 비어 있는 이메일이면 null을 반환한다', async () => {
    await expect(service.findByEmail('   ')).resolves.toBeNull();
    expect(memberRepository.findOne).not.toHaveBeenCalled();
  });

  describe('uploadProfile', () => {
    it('회원이 없으면 NotFoundException을 던진다', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.uploadProfile(1, null as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('신규 프로필 생성 + 태그 동기화 + TEMP 회원 승격을 처리한다', async () => {
      const member = {
        id: 1,
        role: MemberRole.ROLE_TEMP,
        email: 'a@test.com',
      };
      memberRepository.findOne.mockResolvedValueOnce(member);
      profileRepository.findOne.mockResolvedValue(null);
      profileRepository.save.mockResolvedValue(undefined);
      memberRepository.save.mockResolvedValue(member);

      const result = await service.uploadProfile(
        1,
        null as any,
        { introduce: 'hello', hashTag: ['a', 'b'] } as any,
      );

      expect(profileRepository.create).toHaveBeenCalledWith({
        memberId: 1,
        profileUrl: null,
        introduction: 'hello',
      });
      expect(profileRepository.save).toHaveBeenCalled();
      expect(tagService.syncMemberTags).toHaveBeenCalledWith(member, [
        'a',
        'b',
      ]);
      expect(member.role).toBe(MemberRole.ROLE_MEMBER);
      expect(memberRepository.save).toHaveBeenCalledWith(member);
      expect(result).toBe(true);
    });

    it('기존 프로필 수정 시 새 파일 업로드/기존 파일 삭제를 처리한다', async () => {
      const member = { id: 1, role: MemberRole.ROLE_MEMBER };
      const profile = {
        memberId: 1,
        profileUrl: 'https://old/url.png',
        introduction: 'old',
      };
      const file = { originalname: 'a.png', mimetype: 'image/png' } as any;

      memberRepository.findOne.mockResolvedValueOnce(member);
      awsService.uploadFile.mockResolvedValue('https://new/url.png');
      profileRepository.findOne.mockResolvedValue(profile);

      await service.uploadProfile(1, file, {
        introduce: 'new intro',
        hashTag: undefined,
      } as any);

      expect(awsService.uploadFile).toHaveBeenCalledWith(file, 'profile');
      expect(awsService.deleteFile).toHaveBeenCalledWith('https://old/url.png');
      expect(profile.profileUrl).toBe('https://new/url.png');
      expect(profile.introduction).toBe('new intro');
      expect(tagService.syncMemberTags).not.toHaveBeenCalled();
      expect(memberRepository.save).not.toHaveBeenCalledWith(member);
    });

    it('빈 소개/빈 해시태그 배열도 갱신한다', async () => {
      const member = { id: 1, role: MemberRole.ROLE_MEMBER };
      const profile = {
        memberId: 1,
        profileUrl: 'https://old/url.png',
        introduction: 'old',
      };

      memberRepository.findOne.mockResolvedValueOnce(member);
      profileRepository.findOne.mockResolvedValue(profile);

      await service.uploadProfile(
        1,
        null as any,
        {
          introduce: '',
          hashTag: [],
        } as any,
      );

      expect(profile.introduction).toBe('');
      expect(tagService.syncMemberTags).toHaveBeenCalledWith(member, []);
    });
  });

  describe('updateProfile', () => {
    it('회원이 없으면 NotFoundException을 던진다', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile(1, null as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('닉네임/프로필/태그를 갱신한다', async () => {
      const member = { id: 1, nickname: 'old' };
      const profile = {
        memberId: 1,
        profileUrl: 'https://old/profile.png',
        introduction: 'old intro',
      };
      const file = { originalname: 'new.png', mimetype: 'image/png' } as any;
      memberRepository.findOne.mockResolvedValueOnce(member);
      awsService.uploadFile.mockResolvedValue('https://new/profile.png');
      profileRepository.findOne.mockResolvedValue(profile);

      await service.updateProfile(1, file, {
        nickname: 'newNick',
        introduce: 'new intro',
        hashTag: ['x'],
      } as any);

      expect(member.nickname).toBe('newNick');
      expect(memberRepository.save).toHaveBeenCalledWith(member);
      expect(awsService.deleteFile).toHaveBeenCalledWith(
        'https://old/profile.png',
      );
      expect(profile.profileUrl).toBe('https://new/profile.png');
      expect(profile.introduction).toBe('new intro');
      expect(profileRepository.save).toHaveBeenCalledWith(profile);
      expect(tagService.syncMemberTags).toHaveBeenCalledWith(member, ['x']);
    });

    it('빈 소개/빈 해시태그 배열도 갱신한다', async () => {
      const member = { id: 1, nickname: 'old' };
      const profile = {
        memberId: 1,
        profileUrl: 'https://old/profile.png',
        introduction: 'old intro',
      };
      memberRepository.findOne.mockResolvedValueOnce(member);
      profileRepository.findOne.mockResolvedValue(profile);

      await service.updateProfile(
        1,
        null as any,
        {
          nickname: 'newNick',
          introduce: '',
          hashTag: [],
        } as any,
      );

      expect(member.nickname).toBe('newNick');
      expect(profile.introduction).toBe('');
      expect(tagService.syncMemberTags).toHaveBeenCalledWith(member, []);
    });
  });

  describe('getMyProfile', () => {
    it('회원이 없으면 NotFoundException을 던진다', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(service.getMyProfile(1)).rejects.toThrow(NotFoundException);
    });

    it('프로필과 ACTIVE 태그만 응답으로 매핑한다', async () => {
      memberRepository.findOne.mockResolvedValue({
        nickname: 'nick',
        email: 'a@test.com',
        profile: { profileUrl: 'https://img', introduction: 'hi' },
        memberTags: [
          { status: TagStatus.ACTIVE, tag: { name: 'cat' } },
          { status: TagStatus.INACTIVE, tag: { name: 'dog' } },
          { status: TagStatus.ACTIVE, tag: { name: 'bird' } },
        ],
      });

      const result = await service.getMyProfile(1);

      expect(result).toEqual(
        expect.objectContaining({
          nickname: 'nick',
          email: 'a@test.com',
          profileImageUrl: 'https://img',
          introduce: 'hi',
          hashTags: ['cat', 'bird'],
        }),
      );
    });
  });

  describe('getPublicProfile', () => {
    it('회원이 없으면 NotFoundException을 던진다', async () => {
      memberQueryService.findActiveMemberWithProfileAndTags.mockResolvedValue(
        null,
      );

      await expect(service.getPublicProfile(2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('공개 프로필 응답을 구성한다', async () => {
      memberQueryService.findActiveMemberWithProfileAndTags.mockResolvedValue({
        id: 2,
        nickname: 'artist',
        profile: {
          profileUrl: 'https://profile.png',
          introduction: 'hello',
        },
        memberTags: [
          { status: TagStatus.ACTIVE, tag: { name: '#귀여운' } },
          { status: TagStatus.INACTIVE, tag: { name: '#숨김' } },
          { status: TagStatus.ACTIVE, tag: { name: '#누사' } },
        ],
      });
      memberQueryService.countMemberPosts.mockResolvedValue(7);

      const result = await service.getPublicProfile(2);

      expect(memberQueryService.countMemberPosts).toHaveBeenCalledWith(2);
      expect(result).toEqual(
        expect.objectContaining({
          memberId: 2,
          nickname: 'artist',
          profileImageUrl: 'https://profile.png',
          introduce: 'hello',
          hashTags: ['#귀여운', '#누사'],
          drawingCount: 7,
        }),
      );
    });
  });

  describe('getPublicReviewSummary', () => {
    it('회원이 없으면 NotFoundException을 던진다', async () => {
      memberQueryService.existsActiveMember.mockResolvedValue(false);

      await expect(service.getPublicReviewSummary(10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('후기/키워드/완료작업 집계를 반환한다', async () => {
      memberQueryService.existsActiveMember.mockResolvedValue(true);
      memberQueryService.findReceiverReviewStars.mockResolvedValue([
        { id: 1, star: ReviewStar.FIVE },
        { id: 2, star: ReviewStar.FOUR },
        { id: 3, star: ReviewStar.ONE },
      ]);
      memberQueryService.countCompletedWorks.mockResolvedValue(9);
      memberQueryService.findKeywordMapsByReviewIds.mockResolvedValue([
        { keyword: { keyword: '친절해요', isActive: true } },
        { keyword: { keyword: '친절해요', isActive: true } },
        { keyword: { keyword: '귀여워요', isActive: true } },
        { keyword: { keyword: '섬세해요', isActive: true } },
        { keyword: { keyword: '빠르게 작업해요', isActive: true } },
        { keyword: { keyword: '원하는 대로 그려줘요', isActive: true } },
        { keyword: { keyword: '숨김키워드', isActive: false } },
      ]);

      const result = await service.getPublicReviewSummary(10);

      expect(memberQueryService.findReceiverReviewStars).toHaveBeenCalledWith(
        10,
      );
      expect(memberQueryService.countCompletedWorks).toHaveBeenCalledWith(10);
      expect(result).toEqual(
        expect.objectContaining({
          averageStar: 3.33,
          reviewCount: 3,
          completedWorkCount: 9,
          topKeywords: [
            expect.objectContaining({ keyword: '친절해요', count: 2 }),
            expect.objectContaining({ keyword: '귀여워요', count: 1 }),
            expect.objectContaining({ keyword: '빠르게 작업해요', count: 1 }),
            expect.objectContaining({ keyword: '섬세해요', count: 1 }),
            expect.objectContaining({
              keyword: '원하는 대로 그려줘요',
              count: 1,
            }),
          ],
        }),
      );
    });

    it('후기가 없으면 0 집계를 반환한다', async () => {
      memberQueryService.existsActiveMember.mockResolvedValue(true);
      memberQueryService.findReceiverReviewStars.mockResolvedValue([]);
      memberQueryService.countCompletedWorks.mockResolvedValue(0);

      const result = await service.getPublicReviewSummary(11);

      expect(
        memberQueryService.findKeywordMapsByReviewIds,
      ).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          averageStar: 0,
          reviewCount: 0,
          completedWorkCount: 0,
          topKeywords: [],
        }),
      );
    });
  });

  describe('getPublicReviews', () => {
    it('회원이 없으면 NotFoundException을 던진다', async () => {
      memberQueryService.existsActiveMember.mockResolvedValue(false);

      await expect(
        service.getPublicReviews(99, { page: 1, limit: 10 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('후기 목록을 페이지네이션으로 반환한다', async () => {
      const createdAt = new Date('2026-03-28T00:00:00.000Z');
      memberQueryService.existsActiveMember.mockResolvedValue(true);
      memberQueryService.findPublicReviews.mockResolvedValue([
        [
          {
            id: 10,
            star: ReviewStar.FIVE,
            content: '만족해요',
            imageObjectKeys: ['review/1.png'],
            writerId: 4,
            writer: {
              nickname: '작성자',
              profile: { profileUrl: 'https://writer.png' },
            },
            createdAt,
            reviewKeywordMaps: [
              { keyword: { keyword: '친절해요', isActive: true } },
              { keyword: { keyword: '숨김', isActive: false } },
              { keyword: { keyword: '원하는 대로 그려줘요', isActive: true } },
            ],
          },
        ],
        1,
      ]);

      const result = await service.getPublicReviews(5, {
        page: 2,
        limit: 3,
      } as any);

      expect(memberQueryService.findPublicReviews).toHaveBeenCalledWith(
        5,
        2,
        3,
      );
      expect(result).toEqual({
        data: [
          expect.objectContaining({
            id: 10,
            starScore: 5,
            content: '만족해요',
            keywords: ['친절해요', '원하는 대로 그려줘요'],
            imageObjectKeys: ['review/1.png'],
            writerId: 4,
            writerNickname: '작성자',
            writerProfileImageUrl: 'https://writer.png',
            createdAt,
          }),
        ],
        total: 1,
        page: 2,
        limit: 3,
      });
    });
  });

  describe('withdraw', () => {
    it('회원이 없으면 NotFoundException을 던진다', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(service.withdraw(1)).rejects.toThrow(NotFoundException);
    });

    it('회원 상태를 INACTIVE + 삭제 처리하고 식별값을 정리한다', async () => {
      const member = {
        id: 1,
        email: 'user@test.com',
        nickname: 'nick',
        status: MemberStatus.ACTIVE,
        isDeleted: false,
      };
      memberRepository.findOne.mockResolvedValue(member);

      await service.withdraw(1);

      expect(member.status).toBe(MemberStatus.INACTIVE);
      expect(member.isDeleted).toBe(true);
      expect(member.email).toMatch(/^deleted-1-\d+@example\.invalid$/);
      expect(member.nickname).toMatch(/^deleted-member-1-\d+$/);
      expect(memberRepository.save).toHaveBeenCalledWith(member);
    });
  });

  describe('findProfileImageUrlByMemberIds', () => {
    it('memberIds가 비어있으면 빈 Map을 반환한다', async () => {
      const result = await service.findProfileImageUrlByMemberIds([]);

      expect(result.size).toBe(0);
      expect(memberRepository.find).not.toHaveBeenCalled();
    });

    it('프로필 이미지가 있는 회원만 Map에 담는다', async () => {
      memberRepository.find.mockResolvedValue([
        { id: 1, profile: { profileUrl: 'https://1' } },
        { id: 2, profile: { profileUrl: null } },
        { id: 3, profile: null },
      ]);

      const result = await service.findProfileImageUrlByMemberIds([1, 2, 3]);

      expect(result.get(1)).toBe('https://1');
      expect(result.has(2)).toBe(false);
      expect(result.has(3)).toBe(false);
    });
  });

  it('checkNickname은 존재 여부를 boolean으로 반환한다', async () => {
    memberRepository.findOne.mockResolvedValueOnce({ id: 1 });
    await expect(service.checkNickname('used')).resolves.toBe(true);

    memberRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.checkNickname('unused')).resolves.toBe(false);
  });

  describe('updatePassword', () => {
    it('회원이 없으면 NotFoundException을 던진다', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePassword('a@test.com', 'old', 'new'),
      ).rejects.toThrow(NotFoundException);
    });

    it('기존 비밀번호가 불일치하면 BadRequestException을 던진다', async () => {
      memberRepository.findOne.mockResolvedValue({
        email: 'a@test.com',
        password: 'hashed',
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.updatePassword('a@test.com', 'wrong', 'new'),
      ).rejects.toThrow(BadRequestException);
    });

    it('기존 비밀번호 검증 후 새 비밀번호를 해시해 저장한다', async () => {
      const member = { email: 'a@test.com', password: 'hashed' };
      memberRepository.findOne.mockResolvedValue(member);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed' as never);

      await service.updatePassword('a@test.com', 'old', 'new');

      expect(member.password).toBe('new-hashed');
      expect(memberRepository.save).toHaveBeenCalledWith(member);
    });

    it('newPassword가 없으면 저장하지 않는다', async () => {
      const member = { email: 'a@test.com', password: 'hashed' };
      memberRepository.findOne.mockResolvedValue(member);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await service.updatePassword('a@test.com', 'old', undefined);

      expect(memberRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('handleCron', () => {
    it('삭제 대상이 있으면 debug/log를 남긴다', async () => {
      memberRepository.delete.mockResolvedValue({ affected: 2 });
      const logger = (service as any).logger;
      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation();
      const logSpy = jest.spyOn(logger, 'log').mockImplementation();

      await service.handleCron();

      expect(debugSpy).toHaveBeenCalled();
      expect(memberRepository.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          role: MemberRole.ROLE_TEMP,
          status: MemberStatus.ACTIVE,
          createdAt: expect.anything(),
        }),
      );
      expect(logSpy).toHaveBeenCalledWith('Deleted 2 expired TEMP members.');
    });

    it('삭제 대상이 없으면 summary log는 남기지 않는다', async () => {
      memberRepository.delete.mockResolvedValue({ affected: 0 });
      const logger = (service as any).logger;
      const logSpy = jest.spyOn(logger, 'log').mockImplementation();

      await service.handleCron();

      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
