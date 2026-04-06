import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { MemberService } from '../member/member.service';
import { MemberStatus } from '../common/enums';
import { AuthTokenBlacklistService } from './auth-token-blacklist.service';

interface JwtPayload {
  sub: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly memberService: MemberService,
    private readonly authTokenBlacklistService: AuthTokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: configService.get<string>('SECRET_KEY'),
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const authorization = req.headers.authorization;
    if (
      authorization &&
      (await this.authTokenBlacklistService.isBlacklisted(authorization))
    ) {
      throw new UnauthorizedException();
    }

    const { sub: id } = payload;
    const member = await this.memberService.findById(id);
    if (!member || member.status !== MemberStatus.ACTIVE || member.isDeleted) {
      throw new UnauthorizedException();
    }
    return member;
  }
}
