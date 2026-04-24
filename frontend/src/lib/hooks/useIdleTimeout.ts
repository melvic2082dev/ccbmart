'use client';

import { useEffect, useRef } from 'react';

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'visibilitychange',
] as const;

interface UseIdleTimeoutOptions {
  /** Time without interaction before callback fires (ms). Default 15 min. */
  timeoutMs?: number;
  /** Callback fired when idle timeout expires — usually `logout()`. */
  onIdle: () => void;
  /** Skip the hook, e.g. when not logged in. */
  disabled?: boolean;
}

/**
 * Auto-logout when user idles for too long. Reduces the risk of a session
 * being hijacked on an unattended device. Resets on mousemove, keyboard,
 * scroll, touch, or tab re-visibility.
 */
export function useIdleTimeout({
  timeoutMs = 15 * 60 * 1000,
  onIdle,
  disabled = false,
}: UseIdleTimeoutOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    reset();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, reset, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [timeoutMs, disabled]);
}
