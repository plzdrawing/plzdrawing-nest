import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { MemberService } from '../member/member.service';
import { MemberStatus } from '../common/enums';

interface JwtPayload {
  sub: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly memberService: MemberService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SECRET_KEY'),
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: id } = payload;
    const member = await this.memberService.findById(id);
    if (!member || member.status !== MemberStatus.ACTIVE || member.isDeleted) {
      throw new UnauthorizedException();
    }
    return member;
  }
}
