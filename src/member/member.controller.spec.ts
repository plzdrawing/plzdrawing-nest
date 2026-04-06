import { Test, TestingModule } from '@nestjs/testing';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';

describe('MemberController', () => {
  let controller: MemberController;

  const mockMemberService = {
    uploadProfile: jest.fn(),
    updateProfile: jest.fn(),
    getMyProfile: jest.fn(),
    getPublicProfile: jest.fn(),
    getPublicReviews: jest.fn(),
    getPublicReviewSummary: jest.fn(),
    checkNickname: jest.fn(),
    withdraw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [
        {
          provide: MemberService,
          useValue: mockMemberService,
        },
      ],
    }).compile();

    controller = module.get<MemberController>(MemberController);
  });

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });

  it('uploadProfile은 member.id를 추출해 서비스에 위임한다', async () => {
    mockMemberService.uploadProfile.mockResolvedValue(true);
    const member = { id: 10 };
    const file = { originalname: 'profile.png' };
    const dto = { introduce: 'hi' };

    await expect(
      controller.uploadProfile(member as any, file as any, dto as any),
    ).resolves.toBe(true);
    expect(mockMemberService.uploadProfile).toHaveBeenCalledWith(10, file, dto);
  });

  it('updateProfile은 member.id를 추출해 서비스에 위임한다', async () => {
    mockMemberService.updateProfile.mockResolvedValue(true);

    await expect(
      controller.updateProfile(
        { id: 11 } as any,
        { originalname: 'a.png' } as any,
        { nickname: 'nick' } as any,
      ),
    ).resolves.toBe(true);
    expect(mockMemberService.updateProfile).toHaveBeenCalledWith(
      11,
      expect.any(Object),
      expect.objectContaining({ nickname: 'nick' }),
    );
  });

  it('getMyProfile은 member.id로 조회한다', async () => {
    mockMemberService.getMyProfile.mockResolvedValue({ nickname: 'nick' });

    await expect(controller.getMyProfile({ id: 12 } as any)).resolves.toEqual({
      nickname: 'nick',
    });
    expect(mockMemberService.getMyProfile).toHaveBeenCalledWith(12);
  });

  it('getPublicProfile은 memberId를 그대로 전달한다', async () => {
    mockMemberService.getPublicProfile.mockResolvedValue({ memberId: 21 });

    await expect(controller.getPublicProfile(21)).resolves.toEqual({
      memberId: 21,
    });
    expect(mockMemberService.getPublicProfile).toHaveBeenCalledWith(21);
  });

  it('getPublicReviewSummary는 memberId를 그대로 전달한다', async () => {
    mockMemberService.getPublicReviewSummary.mockResolvedValue({
      reviewCount: 4,
    });

    await expect(controller.getPublicReviewSummary(33)).resolves.toEqual({
      reviewCount: 4,
    });
    expect(mockMemberService.getPublicReviewSummary).toHaveBeenCalledWith(33);
  });

  it('getPublicReviews는 memberId/pagination을 그대로 전달한다', async () => {
    const pagination = { page: 2, limit: 5 };
    mockMemberService.getPublicReviews.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      limit: 5,
    });

    await expect(
      controller.getPublicReviews(22, pagination as any),
    ).resolves.toEqual({
      data: [],
      total: 0,
      page: 2,
      limit: 5,
    });
    expect(mockMemberService.getPublicReviews).toHaveBeenCalledWith(
      22,
      pagination,
    );
  });

  it('checkNickname은 쿼리값을 그대로 전달한다', async () => {
    mockMemberService.checkNickname.mockResolvedValue(false);

    await expect(controller.checkNickname('nick')).resolves.toEqual({
      available: true,
    });
    expect(mockMemberService.checkNickname).toHaveBeenCalledWith('nick');
  });

  it('withdraw는 member.id로 탈퇴 처리한다', async () => {
    await controller.withdraw({ id: 13 } as any);

    expect(mockMemberService.withdraw).toHaveBeenCalledWith(13);
  });
});
