import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AlarmService } from './alarm.service';

@ApiTags('Alarm')
@Controller('fcm')
export class AlarmController {
  constructor(private readonly alarmService: AlarmService) {}

  @Post('v1/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FCM 알림 전송 테스트' })
  @ApiResponse({ status: 200, description: '알림 전송 성공', type: Boolean })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async fcmTest() {
    // 테스트용 토큰과 메시지 (실제 테스트 시에는 유효한 토큰 필요)
    const targetToken = 'target';
    const title = '알림 테스트';
    const body = '알림 내용';
    const link = '알림 링크';

    try {
      await this.alarmService.sendMessageTo(targetToken, title, body, link);
    } catch (e) {
      // 테스트 환경에서 토큰이 유효하지 않아 실패하더라도 true 반환 (Legacy 동작 유지)
      console.log('FCM Test send failed (expected without valid token):', e);
    }
    return true;
  }
}
