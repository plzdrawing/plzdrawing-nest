import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletTransactionSourceDedupIndex1782120461000 implements MigrationInterface {
  name = 'AddWalletTransactionSourceDedupIndex1782120461000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_wallet_transaction_source_dedup\` ON \`wallet_transaction\` (\`member_id\`, \`type\`, \`source_type\`, \`source_id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_wallet_transaction_source_dedup\` ON \`wallet_transaction\``,
    );
  }
}
