import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AlarmService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
  ) {}

  async sendMessageTo(
    targetToken: string,
    title: string,
    body: string,
    link: string,
  ): Promise<void> {
    const message = {
      token: targetToken,
      notification: {
        title,
        body,
      },
      webpush: {
        fcmOptions: {
          link,
        },
      },
    };

    try {
      await this.firebaseApp.messaging().send(message);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
}
