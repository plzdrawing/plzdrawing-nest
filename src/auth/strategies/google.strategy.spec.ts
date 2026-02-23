import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  const configService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'GOOGLE_CLIENT_ID':
          return 'client-id';
        case 'GOOGLE_CLIENT_SECRET':
          return 'client-secret';
        case 'GOOGLE_CALLBACK_URL':
          return 'http://localhost/google/callback';
        default:
          return null;
      }
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('정의되어 있어야 한다', () => {
    const strategy = new GoogleStrategy(configService as any);

    expect(strategy).toBeDefined();
    expect(configService.get).toHaveBeenCalledWith('GOOGLE_CLIENT_ID');
    expect(configService.get).toHaveBeenCalledWith('GOOGLE_CLIENT_SECRET');
    expect(configService.get).toHaveBeenCalledWith('GOOGLE_CALLBACK_URL');
  });

  it('validate는 google profile을 OAuth user 형태로 매핑한다', () => {
    const strategy = new GoogleStrategy(configService as any);
    const done = jest.fn();

    strategy.validate(
      'access-token',
      'refresh-token',
      {
        name: { givenName: 'Jiho', familyName: 'Jun' },
        emails: [{ value: 'g@test.com' }],
        photos: [{ value: 'https://photo' }],
      } as any,
      done,
    );

    expect(done).toHaveBeenCalledWith(null, {
      email: 'g@test.com',
      firstName: 'Jiho',
      lastName: 'Jun',
      picture: 'https://photo',
      accessToken: 'access-token',
      provider: 'google',
    });
  });
});
