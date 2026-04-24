import { act, renderHook } from '@testing-library/react';
import { useIdleTimeout } from '@/lib/hooks/useIdleTimeout';
import { useExpiryWarning } from '@/lib/hooks/useExpiryWarning';

describe('useIdleTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('calls onIdle after timeoutMs without activity', () => {
    const onIdle = jest.fn();
    renderHook(() => useIdleTimeout({ onIdle, timeoutMs: 1000 }));
    act(() => { jest.advanceTimersByTime(1001); });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets timer on activity', () => {
    const onIdle = jest.fn();
    renderHook(() => useIdleTimeout({ onIdle, timeoutMs: 1000 }));
    act(() => { jest.advanceTimersByTime(500); });
    act(() => { window.dispatchEvent(new Event('mousemove')); });
    act(() => { jest.advanceTimersByTime(800); });
    expect(onIdle).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(300); });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', () => {
    const onIdle = jest.fn();
    renderHook(() => useIdleTimeout({ onIdle, timeoutMs: 1000, disabled: true }));
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onIdle).not.toHaveBeenCalled();
  });
});

describe('useExpiryWarning', () => {
  function addDays(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  it('returns null for missing expiresAt', () => {
    const { result } = renderHook(() => useExpiryWarning({ expiresAt: null }));
    expect(result.current.level).toBeNull();
    expect(result.current.daysLeft).toBeNull();
  });

  it('classifies expired', () => {
    const { result } = renderHook(() => useExpiryWarning({ expiresAt: addDays(-1) }));
    expect(result.current.level).toBe('expired');
    expect(result.current.isExpired).toBe(true);
  });

  it('classifies critical (<=7 days)', () => {
    const { result } = renderHook(() => useExpiryWarning({ expiresAt: addDays(5) }));
    expect(result.current.level).toBe('critical');
    expect(result.current.isExpired).toBe(false);
  });

  it('classifies warning (<=14 days)', () => {
    const { result } = renderHook(() => useExpiryWarning({ expiresAt: addDays(10) }));
    expect(result.current.level).toBe('warning');
  });

  it('classifies info (<=30 days)', () => {
    const { result } = renderHook(() => useExpiryWarning({ expiresAt: addDays(25) }));
    expect(result.current.level).toBe('info');
  });

  it('returns null when far from expiry', () => {
    const { result } = renderHook(() => useExpiryWarning({ expiresAt: addDays(90) }));
    expect(result.current.level).toBeNull();
  });

  it('respects custom thresholds', () => {
    const { result } = renderHook(() =>
      useExpiryWarning({ expiresAt: addDays(3), thresholds: { critical: 1 } })
    );
    expect(result.current.level).toBe('warning');
  });
});
