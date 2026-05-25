import { ConfigService } from '@nestjs/config';
import { loadFirebaseServiceAccount } from './firebase.module';

describe('loadFirebaseServiceAccount', () => {
  const serviceAccount = {
    project_id: 'test-project',
    client_email: 'firebase@test-project.iam.gserviceaccount.com',
    private_key: 'test-private-key',
  };

  it('base64 환경변수의 Firebase credential을 우선 로드한다', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'FIREBASE_SERVICE_ACCOUNT_BASE64') {
          return Buffer.from(JSON.stringify(serviceAccount)).toString('base64');
        }
        return './missing-service-account.json';
      }),
    } as unknown as ConfigService;

    expect(loadFirebaseServiceAccount(configService)).toEqual(serviceAccount);
  });

  it('credential 설정값이 모두 없으면 명확한 오류를 던진다', () => {
    const configService = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;

    expect(() => loadFirebaseServiceAccount(configService)).toThrow(
      '[FirebaseModule] Set FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_CONFIG_PATH',
    );
  });

  it('base64 credential JSON이 잘못되면 부팅 오류를 던진다', () => {
    const configService = {
      get: jest.fn((key: string) =>
        key === 'FIREBASE_SERVICE_ACCOUNT_BASE64'
          ? Buffer.from('not-json').toString('base64')
          : undefined,
      ),
    } as unknown as ConfigService;

    expect(() => loadFirebaseServiceAccount(configService)).toThrow(
      '[FirebaseModule] Failed to parse Firebase service account from FIREBASE_SERVICE_ACCOUNT_BASE64',
    );
  });
});
