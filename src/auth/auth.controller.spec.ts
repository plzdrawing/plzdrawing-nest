import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemberProvider, MemberRole } from '../common/enums';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    validateUser: jest.fn(),
    oAuthLogin: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OAUTH_REDIRECT_URL') {
        return 'http://localhost:3000/oauth/callback';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });

  it('register는 공개 회원 응답만 반환한다', async () => {
    const dto = { email: 'a@test.com', password: 'pw' } as any;
    const createdAt = new Date('2026-05-25T01:00:00.000Z');
    const member = {
      id: 1,
      email: 'a@test.com',
      nickname: 'tester',
      role: MemberRole.ROLE_MEMBER,
      provider: MemberProvider.EMAIL,
      password: 'hashed-password',
      createdAt,
      updatedAt: createdAt,
    };
    mockAuthService.register.mockResolvedValue(member);

    const result = await controller.register(dto);

    expect(result).toEqual({
      id: 1,
      email: 'a@test.com',
      nickname: 'tester',
      role: MemberRole.ROLE_MEMBER,
      provider: MemberProvider.EMAIL,
      createdAt,
      updatedAt: createdAt,
    });
    expect(result).not.toHaveProperty('password');
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
  });

  it('login은 인증 실패 시 UnauthorizedException을 던진다', async () => {
    mockAuthService.validateUser.mockResolvedValue(null);

    await expect(
      controller.login({ email: 'a@test.com', password: 'wrong' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login은 인증 성공 시 authService.login 결과를 반환한다', async () => {
    const user = {
      id: 1,
      email: 'a@test.com',
      role: MemberRole.ROLE_MEMBER,
    };
    mockAuthService.validateUser.mockResolvedValue(user);
    mockAuthService.login.mockReturnValue({ access_token: 'token' });

    await expect(
      controller.login({ email: 'a@test.com', password: 'pw' } as any),
    ).resolves.toEqual({ access_token: 'token' });

    expect(mockAuthService.validateUser).toHaveBeenCalledWith(
      'a@test.com',
      'pw',
    );
    expect(mockAuthService.login).toHaveBeenCalledWith(user);
  });

  it('getProfile은 공개 회원 응답만 반환한다', () => {
    const createdAt = new Date('2026-05-25T01:00:00.000Z');
    const user = {
      id: 1,
      email: 'a@test.com',
      nickname: 'tester',
      role: MemberRole.ROLE_MEMBER,
      provider: MemberProvider.EMAIL,
      password: 'hashed-password',
      createdAt,
      updatedAt: createdAt,
    } as any;

    const result = controller.getProfile({ user } as any);

    expect(result).toEqual({
      id: 1,
      email: 'a@test.com',
      nickname: 'tester',
      role: MemberRole.ROLE_MEMBER,
      provider: MemberProvider.EMAIL,
      createdAt,
      updatedAt: createdAt,
    });
    expect(result).not.toHaveProperty('password');
  });

  it('logout은 authService.logout 결과를 반환한다', () => {
    mockAuthService.logout.mockReturnValue({ success: true });

    expect(
      controller.logout({
        headers: { authorization: 'Bearer token' },
      } as any),
    ).resolves.toEqual({ success: true });
    expect(mockAuthService.logout).toHaveBeenCalledWith('Bearer token');
  });

  it('googleAuthRedirect는 토큰 발급 후 프론트 콜백으로 리다이렉트한다', async () => {
    mockAuthService.oAuthLogin.mockResolvedValue({ access_token: 'g-token' });
    const res = { redirect: jest.fn() };

    await controller.googleAuthRedirect(
      { user: { email: 'g@test.com', provider: 'google' } } as any,
      res as any,
    );

    expect(mockAuthService.oAuthLogin).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/oauth/callback?token=g-token',
    );
  });

  it('kakaoAuthRedirect는 토큰 발급 후 프론트 콜백으로 리다이렉트한다', async () => {
    mockAuthService.oAuthLogin.mockResolvedValue({ access_token: 'k-token' });
    const res = { redirect: jest.fn() };

    await controller.kakaoAuthRedirect(
      { user: { email: 'k@test.com', provider: 'kakao' } } as any,
      res as any,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/oauth/callback?token=k-token',
    );
  });
});
