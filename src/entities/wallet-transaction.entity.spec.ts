import { getMetadataArgsStorage } from 'typeorm';
import { WalletTransaction } from './wallet-transaction.entity';

describe('WalletTransaction entity', () => {
  it('동일 원천의 거래내역 중복 생성을 막는 unique index를 가진다', () => {
    const index = getMetadataArgsStorage().indices.find(
      (metadata) =>
        metadata.target === WalletTransaction &&
        metadata.name === 'IDX_wallet_transaction_source_dedup',
    );

    expect(index).toBeDefined();
    expect(index?.columns).toEqual([
      'memberId',
      'type',
      'sourceType',
      'sourceId',
    ]);
    expect(index?.unique).toBe(true);
  });
});
