import { DEFAULT_CORS_ORIGINS, parseCorsOrigins } from './cors.config';

describe('parseCorsOrigins', () => {
  it('값이 없으면 기본 origin 목록을 반환해야 한다', () => {
    expect(parseCorsOrigins(undefined)).toEqual(DEFAULT_CORS_ORIGINS);
    expect(parseCorsOrigins('   ')).toEqual(DEFAULT_CORS_ORIGINS);
  });

  it('쉼표로 구분된 origin 목록을 trim해서 반환해야 한다', () => {
    expect(
      parseCorsOrigins('http://localhost:3000, https://example.com'),
    ).toEqual(['http://localhost:3000', 'https://example.com']);
  });

  it('빈 항목과 중복 origin을 제거해야 한다', () => {
    expect(
      parseCorsOrigins(
        'http://localhost:3000,, http://localhost:3000,https://app.example.com',
      ),
    ).toEqual(['http://localhost:3000', 'https://app.example.com']);
  });

  it('기본 origin 목록을 별도로 지정할 수 있어야 한다', () => {
    expect(parseCorsOrigins('', ['https://fallback.example.com'])).toEqual([
      'https://fallback.example.com',
    ]);
  });
});
