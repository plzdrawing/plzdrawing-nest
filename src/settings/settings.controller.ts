import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { AppInfoResponseDto } from './dto/app-info-response.dto';
import { NotificationPreferenceResponseDto } from './dto/notification-preference-response.dto';
import { SettingsSummaryResponseDto } from './dto/settings-summary-response.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('v1/summary')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '설정 홈 요약 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '설정 홈 요약 정보 조회 성공',
    type: SettingsSummaryResponseDto,
  })
  async getSummary(
    @GetUser() member: Member,
  ): Promise<SettingsSummaryResponseDto> {
    return this.settingsService.getSummary(member.id);
  }

  @Get('v1/notifications')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '알림 설정 조회' })
  @ApiResponse({
    status: 200,
    description: '알림 설정 조회 성공',
    type: NotificationPreferenceResponseDto,
  })
  async getNotificationPreferences(
    @GetUser() member: Member,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.settingsService.getNotificationPreferences(member.id);
  }

  @Patch('v1/notifications')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '알림 설정 수정' })
  @ApiBody({ type: UpdateNotificationPreferenceDto })
  @ApiResponse({
    status: 200,
    description: '알림 설정 수정 성공',
    type: NotificationPreferenceResponseDto,
  })
  async updateNotificationPreferences(
    @GetUser() member: Member,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.settingsService.updateNotificationPreferences(member.id, dto);
  }

  @Get('v1/app-info')
  @ApiOperation({ summary: '앱 관리 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '앱 관리 정보 조회 성공',
    type: AppInfoResponseDto,
  })
  getAppInfo(): AppInfoResponseDto {
    return this.settingsService.getAppInfo();
  }
}
