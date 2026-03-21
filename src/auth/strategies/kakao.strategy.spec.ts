import { KakaoStrategy } from './kakao.strategy';

describe('KakaoStrategy', () => {
  const configService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'KAKAO_CLIENT_ID':
          return 'kakao-client-id';
        case 'KAKAO_CLIENT_SECRET':
          return 'kakao-client-secret';
        case 'KAKAO_REDIRECT_URI':
          return 'http://localhost/kakao/callback';
        default:
          return null;
      }
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('정의되어 있어야 한다', () => {
    const strategy = new KakaoStrategy(configService as any);

    expect(strategy).toBeDefined();
    expect(configService.get).toHaveBeenCalledWith('KAKAO_CLIENT_ID');
    expect(configService.get).toHaveBeenCalledWith('KAKAO_CLIENT_SECRET');
    expect(configService.get).toHaveBeenCalledWith('KAKAO_REDIRECT_URI');
  });

  it('validate는 kakao profile을 OAuth user 형태로 매핑한다', () => {
    const strategy = new KakaoStrategy(configService as any);
    const done = jest.fn();

    strategy.validate(
      'access-token',
      'refresh-token',
      {
        username: 'kakaoNick',
        _json: {
          kakao_account: {
            email: 'k@test.com',
            profile: { profile_image_url: 'https://kakao/img' },
          },
        },
      } as any,
      done,
    );

    expect(done).toHaveBeenCalledWith(null, {
      email: 'k@test.com',
      nickname: 'kakaoNick',
      picture: 'https://kakao/img',
      accessToken: 'access-token',
      provider: 'kakao',
    });
  });
});
