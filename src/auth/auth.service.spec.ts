import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { MemberService } from '../member/member.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MemberProvider, MemberRole } from '../common/enums';

describe('AuthService', () => {
  let service: AuthService;

  const mockMemberService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: MemberService,
          useValue: mockMemberService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('비밀번호가 일치하면 password 제외 사용자 정보를 반환한다', async () => {
      const member = {
        id: 1,
        email: 'a@test.com',
        password: 'hashed',
        role: MemberRole.ROLE_MEMBER,
      } as any;
      mockMemberService.findByEmail.mockResolvedValue(member);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser('a@test.com', 'plain');

      expect(mockMemberService.findByEmail).toHaveBeenCalledWith('a@test.com');
      expect(result).toEqual({
        id: 1,
        email: 'a@test.com',
        role: MemberRole.ROLE_MEMBER,
      });
      expect((result as any).password).toBeUndefined();
    });

    it('회원이 없으면 null을 반환한다', async () => {
      mockMemberService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('none@test.com', 'pw'),
      ).resolves.toBeNull();
    });

    it('비밀번호가 불일치하면 null을 반환한다', async () => {
      mockMemberService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        password: 'hashed',
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.validateUser('a@test.com', 'wrong'),
      ).resolves.toBeNull();
    });
  });

  describe('login', () => {
    it('JWT payload를 서명해 access token을 반환한다', () => {
      mockJwtService.sign.mockReturnValue('token');

      const result = service.login({
        id: 1,
        email: 'a@test.com',
        role: MemberRole.ROLE_MEMBER,
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: 'a@test.com',
        sub: 1,
        role: MemberRole.ROLE_MEMBER,
      });
      expect(result).toEqual({ access_token: 'token' });
    });
  });

  describe('register', () => {
    it('비밀번호를 해시하고 입력 role은 무시한 뒤 회원을 생성한다', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      mockMemberService.create.mockResolvedValue({ id: 1 });

      await service.register({
        email: 'a@test.com',
        password: 'plain',
        role: MemberRole.ROLE_ADMIN,
      } as any);

      expect(mockMemberService.create).toHaveBeenCalledWith({
        email: 'a@test.com',
        password: 'hashed-password',
      });
    });
  });

  describe('logout', () => {
    it('성공 응답을 반환한다', () => {
      expect(service.logout()).toEqual({ success: true });
    });
  });

  describe('oAuthLogin', () => {
    it('소셜 계정 이메일이 없으면 UnauthorizedException을 던진다', async () => {
      await expect(
        service.oAuthLogin({
          provider: 'kakao',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('기존 회원이면 생성 없이 토큰만 발급한다', async () => {
      const member = {
        id: 10,
        email: 'k@test.com',
        role: MemberRole.ROLE_MEMBER,
      };
      mockMemberService.findByEmail.mockResolvedValue(member);
      mockJwtService.sign.mockReturnValue('oauth-token');

      const result = await service.oAuthLogin({
        email: 'k@test.com',
        provider: 'kakao',
        nickname: 'nick',
      });

      expect(mockMemberService.create).not.toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: 'k@test.com',
        sub: 10,
        role: MemberRole.ROLE_MEMBER,
      });
      expect(result).toEqual({ access_token: 'oauth-token' });
    });

    it('신규 구글 회원이면 임시회원으로 생성 후 토큰 발급한다', async () => {
      mockMemberService.findByEmail.mockResolvedValue(null);
      mockMemberService.create.mockResolvedValue({
        id: 11,
        email: 'g@test.com',
        role: MemberRole.ROLE_TEMP,
      });
      mockJwtService.sign.mockReturnValue('new-google-token');

      const result = await service.oAuthLogin({
        email: 'g@test.com',
        provider: 'google',
        firstName: 'G',
      });

      expect(mockMemberService.create).toHaveBeenCalledWith({
        email: 'g@test.com',
        nickname: 'G',
        provider: MemberProvider.GOOGLE,
        role: MemberRole.ROLE_TEMP,
      });
      expect(result).toEqual({ access_token: 'new-google-token' });
    });

    it('신규 카카오 회원이면 카카오 provider로 생성한다', async () => {
      mockMemberService.findByEmail.mockResolvedValue(null);
      mockMemberService.create.mockResolvedValue({
        id: 12,
        email: 'k2@test.com',
        role: MemberRole.ROLE_TEMP,
      });
      mockJwtService.sign.mockReturnValue('new-kakao-token');

      await service.oAuthLogin({
        email: 'k2@test.com',
        provider: 'kakao',
        nickname: 'kakaoNick',
      });

      expect(mockMemberService.create).toHaveBeenCalledWith({
        email: 'k2@test.com',
        nickname: 'kakaoNick',
        provider: MemberProvider.KAKAO,
        role: MemberRole.ROLE_TEMP,
      });
    });
  });
});
