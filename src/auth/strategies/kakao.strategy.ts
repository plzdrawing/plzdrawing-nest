import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID'),
      callbackURL: configService.get<string>('KAKAO_REDIRECT_URI'),
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: any,
  ): Promise<any> {
    const { username, _json } = profile;
    const kakaoAccount = _json.kakao_account;
    const user = {
      email: kakaoAccount.email,
      nickname: username,
      picture: kakaoAccount.profile?.profile_image_url,
      accessToken,
      provider: 'kakao',
    };
    done(null, user);
  }
}
