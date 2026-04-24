import { formatMoney, formatMoneyDisplay } from '@/components/ui/money-input';

describe('formatMoney', () => {
  it('returns empty string for 0, null, undefined', () => {
    expect(formatMoney(0)).toBe('');
    expect(formatMoney(null)).toBe('');
    expect(formatMoney(undefined)).toBe('');
  });

  it('groups with dots in vi-VN locale', () => {
    expect(formatMoney(1_000_000)).toBe('1.000.000');
  });
});

describe('formatMoneyDisplay', () => {
  it('returns dash for 0 / null / undefined', () => {
    expect(formatMoneyDisplay(0)).toBe('—');
    expect(formatMoneyDisplay(null)).toBe('—');
  });

  it('appends đ suffix', () => {
    expect(formatMoneyDisplay(1234)).toBe('1.234đ');
  });
});
