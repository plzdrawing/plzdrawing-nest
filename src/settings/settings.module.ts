import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../entities/member.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { Terms } from '../entities/terms.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { TermsController } from './terms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Member, NotificationPreference, Terms])],
  controllers: [SettingsController, TermsController],
  providers: [SettingsService],
})
export class SettingsModule {}
