import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: { message?: string } | undefined,
  ): TUser {
    if (err) {
      throw err;
    }

    if (info?.message && info.message !== 'No auth token') {
      throw new UnauthorizedException(info.message);
    }

    return (user ?? null) as TUser;
  }
}
