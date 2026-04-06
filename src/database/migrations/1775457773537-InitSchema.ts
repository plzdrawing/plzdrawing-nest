import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1775457773537 implements MigrationInterface {
  name = 'InitSchema1775457773537';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`app_setting\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`id\` int NOT NULL AUTO_INCREMENT, \`minimum_supported_version\` varchar(255) NULL, \`support_email\` varchar(255) NULL, \`support_hours\` varchar(255) NULL, \`privacy_policy_url\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`app_setting\``);
  }
}
