import { formatNumber, formatVND } from '@/lib/api';

describe('formatVND', () => {
  it('formats integer amounts as Vietnamese currency', () => {
    const out = formatVND(1_234_567);
    expect(out).toContain('1.234.567');
    expect(out).toMatch(/₫/);
  });

  it('formats zero', () => {
    expect(formatVND(0)).toContain('0');
  });
});

describe('formatNumber', () => {
  it('groups thousands with dots per vi-VN locale', () => {
    expect(formatNumber(1_000_000)).toBe('1.000.000');
  });

  it('returns 0 for zero input', () => {
    expect(formatNumber(0)).toBe('0');
  });
});
