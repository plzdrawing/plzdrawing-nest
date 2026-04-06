import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { createHash } from 'crypto';

interface JwtPayloadWithExp {
  exp?: number;
}

@Injectable()
export class AuthTokenBlacklistService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  async blacklistAccessToken(token: string): Promise<void> {
    const normalizedToken = this.extractBearerToken(token);
    const payload = this.jwtService.decode(normalizedToken);

    if (!payload?.exp) {
      throw new BadRequestException('Invalid access token');
    }

    const ttlMs = payload.exp * 1000 - Date.now();
    if (ttlMs <= 0) {
      throw new UnauthorizedException('Access token already expired');
    }

    await this.redis.set(
      this.getBlacklistKey(normalizedToken),
      '1',
      'PX',
      ttlMs,
    );
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const normalizedToken = this.extractBearerToken(token);
    const value = await this.redis.get(this.getBlacklistKey(normalizedToken));
    return value === '1';
  }

  extractBearerToken(authorization?: string): string {
    if (!authorization) {
      throw new BadRequestException('Authorization header is required');
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new BadRequestException('Invalid authorization header');
    }

    return token;
  }

  private getBlacklistKey(token: string): string {
    return `auth:blacklist:${createHash('sha256').update(token).digest('hex')}`;
  }
}
