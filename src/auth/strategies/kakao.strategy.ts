import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID'),
      clientSecret: configService.get<string>('KAKAO_CLIENT_SECRET'),
      callbackURL: configService.get<string>('KAKAO_REDIRECT_URI'),
    });
  }

  validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: unknown) => void,
  ): void {
    const { username, _json } = profile;
    const kakaoAccount = _json?.kakao_account ?? {};
    const user = {
      email: kakaoAccount.email,
      nickname: kakaoAccount.profile?.nickname ?? username,
      picture: kakaoAccount.profile?.profile_image_url,
      accessToken,
      provider: 'kakao',
    };
    done(null, user);
  }
}
