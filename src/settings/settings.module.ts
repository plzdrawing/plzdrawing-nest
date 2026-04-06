import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from '../entities/app-setting.entity';
import { Member } from '../entities/member.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { Terms } from '../entities/terms.entity';
import { Wallet } from '../entities/wallet.entity';
import { WithdrawAccountModule } from '../withdraw-account/withdraw-account.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { TermsController } from './terms.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppSetting,
      Member,
      NotificationPreference,
      Terms,
      Wallet,
    ]),
    WithdrawAccountModule,
  ],
  controllers: [SettingsController, TermsController],
  providers: [SettingsService],
})
export class SettingsModule {}
