import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { MemberStatus } from '../common/enums';

describe('JwtStrategy', () => {
  const mockConfigService = {
    get: jest.fn().mockReturnValue('secret'),
  };
  const mockMemberService = {
    findById: jest.fn(),
  };
  const mockAuthTokenBlacklistService = {
    isBlacklisted: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('정의되어 있어야 한다', () => {
    const strategy = new JwtStrategy(
      mockConfigService as any,
      mockMemberService as any,
      mockAuthTokenBlacklistService as any,
    );

    expect(strategy).toBeDefined();
    expect(mockConfigService.get).toHaveBeenCalledWith('SECRET_KEY');
  });

  it('validate는 회원이 있으면 회원 정보를 반환한다', async () => {
    const strategy = new JwtStrategy(
      mockConfigService as any,
      mockMemberService as any,
      mockAuthTokenBlacklistService as any,
    );
    const member = {
      id: 1,
      email: 'a@test.com',
      status: MemberStatus.ACTIVE,
      isDeleted: false,
    };
    mockMemberService.findById.mockResolvedValue(member);

    mockAuthTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

    await expect(
      strategy.validate({ headers: { authorization: 'Bearer token' } } as any, {
        sub: 1,
      }),
    ).resolves.toBe(member);
    expect(mockMemberService.findById).toHaveBeenCalledWith(1);
  });

  it('validate는 회원이 없으면 UnauthorizedException을 던진다', async () => {
    const strategy = new JwtStrategy(
      mockConfigService as any,
      mockMemberService as any,
      mockAuthTokenBlacklistService as any,
    );
    mockMemberService.findById.mockResolvedValue(null);
    mockAuthTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

    await expect(
      strategy.validate({ headers: { authorization: 'Bearer token' } } as any, {
        sub: 999,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('validate는 비활성 회원이면 UnauthorizedException을 던진다', async () => {
    const strategy = new JwtStrategy(
      mockConfigService as any,
      mockMemberService as any,
      mockAuthTokenBlacklistService as any,
    );
    mockMemberService.findById.mockResolvedValue({
      id: 1,
      status: MemberStatus.INACTIVE,
      isDeleted: false,
    });
    mockAuthTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

    await expect(
      strategy.validate({ headers: { authorization: 'Bearer token' } } as any, {
        sub: 1,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('validate는 삭제 회원이면 UnauthorizedException을 던진다', async () => {
    const strategy = new JwtStrategy(
      mockConfigService as any,
      mockMemberService as any,
      mockAuthTokenBlacklistService as any,
    );
    mockMemberService.findById.mockResolvedValue({
      id: 1,
      status: MemberStatus.ACTIVE,
      isDeleted: true,
    });
    mockAuthTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

    await expect(
      strategy.validate({ headers: { authorization: 'Bearer token' } } as any, {
        sub: 1,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('validate는 블랙리스트 토큰이면 UnauthorizedException을 던진다', async () => {
    const strategy = new JwtStrategy(
      mockConfigService as any,
      mockMemberService as any,
      mockAuthTokenBlacklistService as any,
    );
    mockAuthTokenBlacklistService.isBlacklisted.mockResolvedValue(true);

    await expect(
      strategy.validate({ headers: { authorization: 'Bearer token' } } as any, {
        sub: 1,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
