import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('app_setting')
export class AppSetting extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'minimum_supported_version', nullable: true })
  minimumSupportedVersion: string | null;

  @Column({ name: 'support_email', nullable: true })
  supportEmail: string | null;

  @Column({ name: 'support_hours', nullable: true })
  supportHours: string | null;

  @Column({ name: 'privacy_policy_url', nullable: true })
  privacyPolicyUrl: string | null;
}
