import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class KakaoAuthGuard extends AuthGuard('kakao') {
  getAuthenticateOptions(_context: ExecutionContext): { scope: string[] } {
    return {
      scope: ['account_email', 'profile_nickname', 'profile_image'],
    };
  }
}
