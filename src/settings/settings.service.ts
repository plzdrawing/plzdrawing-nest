import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagStatus } from '../common/enums';
import { Member } from '../entities/member.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { Terms } from '../entities/terms.entity';
import { AppInfoResponseDto } from './dto/app-info-response.dto';
import { NotificationPreferenceResponseDto } from './dto/notification-preference-response.dto';
import { SettingsSummaryResponseDto } from './dto/settings-summary-response.dto';
import { TermResponseDto } from './dto/term-response.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(NotificationPreference)
    private readonly notificationPreferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(Terms)
    private readonly termsRepository: Repository<Terms>,
    private readonly configService: ConfigService,
  ) {}

  async getSummary(memberId: number): Promise<SettingsSummaryResponseDto> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['profile', 'memberTags', 'memberTags.tag'],
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const preference = await this.notificationPreferenceRepository.findOne({
      where: { memberId },
    });

    const activeTags = member.memberTags
      .filter((memberTag) => memberTag.status === TagStatus.ACTIVE)
      .map((memberTag) => memberTag.tag.name);

    return new SettingsSummaryResponseDto(
      member.nickname,
      member.profile?.profileUrl ?? null,
      activeTags,
      null,
      false,
      preference?.allEnabled ?? true,
    );
  }

  async getNotificationPreferences(
    memberId: number,
  ): Promise<NotificationPreferenceResponseDto> {
    const preference = await this.getOrCreateNotificationPreference(memberId);
    return this.mapNotificationPreference(preference);
  }

  async updateNotificationPreferences(
    memberId: number,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    const preference = await this.getOrCreateNotificationPreference(memberId);

    if (dto.allEnabled !== undefined) {
      preference.allEnabled = dto.allEnabled;
    }
    if (dto.chatEnabled !== undefined) {
      preference.chatEnabled = dto.chatEnabled;
    }
    if (dto.paymentEnabled !== undefined) {
      preference.paymentEnabled = dto.paymentEnabled;
    }
    if (dto.marketingEnabled !== undefined) {
      preference.marketingEnabled = dto.marketingEnabled;
    }

    const savedPreference =
      await this.notificationPreferenceRepository.save(preference);

    return this.mapNotificationPreference(savedPreference);
  }

  getAppInfo(): AppInfoResponseDto {
    return new AppInfoResponseDto(
      this.configService.get<string>('APP_VERSION') ?? '0.0.1',
      this.configService.get<string>('MIN_SUPPORTED_VERSION') ?? '0.0.1',
      this.configService.get<string>('SUPPORT_EMAIL') ??
        'support@plzdrawing.com',
      this.configService.get<string>('SUPPORT_HOURS') ?? '평일 10:00 - 18:00',
      this.configService.get<string>('PRIVACY_POLICY_URL') ?? null,
    );
  }

  async getTerms(): Promise<TermResponseDto[]> {
    const terms = await this.termsRepository.find({
      order: { createdAt: 'DESC' },
    });

    return terms.map(
      (term) =>
        new TermResponseDto(
          term.id,
          term.title,
          term.version,
          term.content,
          term.createdAt,
        ),
    );
  }

  private async getOrCreateNotificationPreference(
    memberId: number,
  ): Promise<NotificationPreference> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const existingPreference =
      await this.notificationPreferenceRepository.findOne({
        where: { memberId },
      });
    if (existingPreference) {
      return existingPreference;
    }

    return this.notificationPreferenceRepository.save(
      this.notificationPreferenceRepository.create({
        memberId,
        allEnabled: true,
        chatEnabled: true,
        paymentEnabled: true,
        marketingEnabled: false,
      }),
    );
  }

  private mapNotificationPreference(
    preference: NotificationPreference,
  ): NotificationPreferenceResponseDto {
    return new NotificationPreferenceResponseDto(
      preference.allEnabled,
      preference.chatEnabled,
      preference.paymentEnabled,
      preference.marketingEnabled,
    );
  }
}
