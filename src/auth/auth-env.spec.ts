import { assertRequiredAuthEnv } from './auth-env';

describe('assertRequiredAuthEnv', () => {
  it('운영 환경이 아니면 필수값이 없어도 통과한다', () => {
    expect(() => assertRequiredAuthEnv({}, false)).not.toThrow();
  });

  it('운영 환경에서 필수값 누락 시 에러를 던진다', () => {
    expect(() =>
      assertRequiredAuthEnv(
        {
          OAUTH_REDIRECT_URL: ' ',
          KAKAO_CLIENT_ID: 'kakao-client-id',
          KAKAO_CLIENT_SECRET: undefined,
          KAKAO_REDIRECT_URI: '',
        },
        true,
      ),
    ).toThrow(
      '[AuthModule] Missing required environment variables in production: OAUTH_REDIRECT_URL, KAKAO_CLIENT_SECRET, KAKAO_REDIRECT_URI',
    );
  });

  it('운영 환경에서 필수값이 모두 있으면 통과한다', () => {
    expect(() =>
      assertRequiredAuthEnv(
        {
          OAUTH_REDIRECT_URL: 'myapp://oauth/callback',
          KAKAO_CLIENT_ID: 'kakao-client-id',
          KAKAO_CLIENT_SECRET: 'kakao-client-secret',
          KAKAO_REDIRECT_URI: 'https://api.example.com/api/auth/kakao/callback',
        },
        true,
      ),
    ).not.toThrow();
  });
});
