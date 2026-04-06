import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenBlacklistService } from './auth-token-blacklist.service';

describe('AuthTokenBlacklistService', () => {
  let service: AuthTokenBlacklistService;

  const mockRedis = {
    set: jest.fn(),
    get: jest.fn(),
  };

  const mockJwtService = {
    decode: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthTokenBlacklistService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthTokenBlacklistService>(AuthTokenBlacklistService);
  });

  it('로그아웃 시 access token을 만료 시점까지 블랙리스트에 저장한다', async () => {
    mockJwtService.decode.mockReturnValue({
      exp: Math.floor((Date.now() + 60_000) / 1000),
    });

    await service.blacklistAccessToken('Bearer token');

    expect(mockRedis.set).toHaveBeenCalled();
    expect(mockRedis.set.mock.calls[0][0]).toMatch(/^auth:blacklist:/);
    expect(mockRedis.set.mock.calls[0][1]).toBe('1');
    expect(mockRedis.set.mock.calls[0][2]).toBe('PX');
  });

  it('authorization header가 없으면 BadRequestException을 던진다', async () => {
    await expect(
      service.blacklistAccessToken(undefined as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('exp 없는 토큰이면 BadRequestException을 던진다', async () => {
    mockJwtService.decode.mockReturnValue({});

    await expect(service.blacklistAccessToken('Bearer token')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('이미 만료된 토큰이면 UnauthorizedException을 던진다', async () => {
    mockJwtService.decode.mockReturnValue({
      exp: Math.floor((Date.now() - 60_000) / 1000),
    });

    await expect(service.blacklistAccessToken('Bearer token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('블랙리스트 조회는 redis 값을 기준으로 판단한다', async () => {
    mockRedis.get.mockResolvedValue('1');

    await expect(service.isBlacklisted('Bearer token')).resolves.toBe(true);
  });
});
