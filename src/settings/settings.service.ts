import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberRole, TagStatus } from '../common/enums';
import { Member } from '../entities/member.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { Terms } from '../entities/terms.entity';
import { Wallet } from '../entities/wallet.entity';
import { WithdrawAccountService } from '../withdraw-account/withdraw-account.service';
import { AppInfoResponseDto } from './dto/app-info-response.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { NotificationPreferenceResponseDto } from './dto/notification-preference-response.dto';
import { SettingsSummaryResponseDto } from './dto/settings-summary-response.dto';
import { TermResponseDto } from './dto/term-response.dto';
import { UpdateTermDto } from './dto/update-term.dto';
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
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly withdrawAccountService: WithdrawAccountService,
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
    const wallet = await this.walletRepository.findOne({
      where: { memberId },
    });
    const hasWithdrawAccount =
      await this.withdrawAccountService.hasActiveWithdrawAccount(memberId);

    const activeTags = member.memberTags
      .filter((memberTag) => memberTag.status === TagStatus.ACTIVE)
      .map((memberTag) => memberTag.tag.name);

    return new SettingsSummaryResponseDto(
      member.nickname,
      member.profile?.profileUrl ?? null,
      activeTags,
      wallet?.balance ?? 0,
      hasWithdrawAccount,
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

  async createTerm(
    member: Member,
    dto: CreateTermDto,
  ): Promise<TermResponseDto> {
    this.assertAdmin(member);

    const term = await this.termsRepository.save(
      this.termsRepository.create({
        adminId: member.id,
        title: dto.title.trim(),
        version: dto.version.trim(),
        content: dto.content.trim(),
      }),
    );

    return this.mapTerm(term);
  }

  async updateTerm(
    member: Member,
    termId: number,
    dto: UpdateTermDto,
  ): Promise<TermResponseDto> {
    this.assertAdmin(member);

    const term = await this.termsRepository.findOne({
      where: { id: termId },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    if (dto.title !== undefined) {
      term.title = dto.title.trim();
    }
    if (dto.version !== undefined) {
      term.version = dto.version.trim();
    }
    if (dto.content !== undefined) {
      term.content = dto.content.trim();
    }

    const savedTerm = await this.termsRepository.save(term);
    return this.mapTerm(savedTerm);
  }

  async removeTerm(member: Member, termId: number): Promise<void> {
    this.assertAdmin(member);

    const term = await this.termsRepository.findOne({
      where: { id: termId },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    await this.termsRepository.remove(term);
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

  private mapTerm(term: Terms): TermResponseDto {
    return new TermResponseDto(
      term.id,
      term.title,
      term.version,
      term.content,
      term.createdAt,
    );
  }

  private assertAdmin(member: Member): void {
    if (member.role !== MemberRole.ROLE_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }
}
