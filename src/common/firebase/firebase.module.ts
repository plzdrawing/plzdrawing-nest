import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const FIREBASE_DISABLED_MESSAGE_ID = 'firebase-disabled';

export function isFirebaseEnabled(configService: ConfigService): boolean {
  const value = configService.get<string>('FIREBASE_ENABLED')?.trim();
  if (!value) {
    return true;
  }

  return !['false', '0', 'no', 'off'].includes(value.toLowerCase());
}

function parseServiceAccount(
  rawValue: string,
  source: string,
): admin.ServiceAccount {
  try {
    return JSON.parse(rawValue) as admin.ServiceAccount;
  } catch {
    throw new Error(
      `[FirebaseModule] Failed to parse Firebase service account from ${source}`,
    );
  }
}

export function loadFirebaseServiceAccount(
  configService: ConfigService,
): admin.ServiceAccount {
  const encodedServiceAccount = configService
    .get<string>('FIREBASE_SERVICE_ACCOUNT_BASE64')
    ?.trim();
  if (encodedServiceAccount) {
    return parseServiceAccount(
      Buffer.from(encodedServiceAccount, 'base64').toString('utf8'),
      'FIREBASE_SERVICE_ACCOUNT_BASE64',
    );
  }

  const firebaseConfigPath = configService
    .get<string>('FIREBASE_CONFIG_PATH')
    ?.trim();
  if (!firebaseConfigPath) {
    throw new Error(
      '[FirebaseModule] Set FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_CONFIG_PATH',
    );
  }

  const absolutePath = path.resolve(process.cwd(), firebaseConfigPath);
  let rawServiceAccount: string;
  try {
    rawServiceAccount = fs.readFileSync(absolutePath, 'utf8');
  } catch {
    throw new Error(
      `[FirebaseModule] Cannot read Firebase service account file at ${absolutePath}`,
    );
  }

  return parseServiceAccount(rawServiceAccount, absolutePath);
}

function createDisabledFirebaseApp(): admin.app.App {
  return {
    messaging: () => ({
      send: async () => FIREBASE_DISABLED_MESSAGE_ID,
    }),
  } as unknown as admin.app.App;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: (configService: ConfigService) => {
        if (!isFirebaseEnabled(configService)) {
          return createDisabledFirebaseApp();
        }

        const serviceAccount = loadFirebaseServiceAccount(configService);

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule {}
