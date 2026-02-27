import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MemberService } from '../member/member.service';
import { Member } from '../entities/member.entity';
import { MemberProvider, MemberRole } from '../common/enums';

export type AuthenticatedMember = Omit<Member, 'password'>;

export interface OAuthUser {
  email: string;
  nickname?: string;
  firstName?: string;
  provider: 'google' | 'kakao';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly memberService: MemberService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<AuthenticatedMember | null> {
    const member = await this.memberService.findByEmail(email);
    if (member && (await bcrypt.compare(pass, member.password))) {
      const memberWithoutPassword = { ...member } as Partial<Member>;
      delete memberWithoutPassword.password;
      return memberWithoutPassword as AuthenticatedMember;
    }
    return null;
  }

  login(member: Pick<Member, 'id' | 'email' | 'role'>): {
    access_token: string;
  } {
    const payload = { email: member.email, sub: member.id, role: member.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(data: Partial<Member>): Promise<Member> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role, ...rest } = data;
    return this.memberService.create({
      ...rest,
      password: hashedPassword,
    });
  }

  async oAuthLogin(user: OAuthUser): Promise<{ access_token: string }> {
    let member = await this.memberService.findByEmail(user.email);

    if (!member) {
      member = await this.memberService.create({
        email: user.email,
        nickname: user.nickname || user.firstName,
        provider:
          user.provider === 'google'
            ? MemberProvider.GOOGLE
            : MemberProvider.KAKAO,
        role: MemberRole.ROLE_TEMP,
      });
    }

    const payload = { email: member.email, sub: member.id, role: member.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
