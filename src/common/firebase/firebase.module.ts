import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: (configService: ConfigService) => {
        const firebaseConfigPath = configService.get<string>(
          'FIREBASE_CONFIG_PATH',
        );

        // 절대 경로로 변환
        const absolutePath = path.resolve(process.cwd(), firebaseConfigPath);

        const serviceAccount = require(absolutePath);

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
