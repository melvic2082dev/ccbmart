'use client';

import { useMemo } from 'react';

export type ExpiryLevel = 'expired' | 'critical' | 'warning' | 'info' | null;

export interface ExpiryWarningInput {
  /** ISO date string (YYYY-MM-DD) or Date. */
  expiresAt: string | Date | null | undefined;
  /** Optional custom thresholds in days. */
  thresholds?: { critical?: number; warning?: number; info?: number };
}

export interface ExpiryWarningResult {
  level: ExpiryLevel;
  daysLeft: number | null;
  isExpired: boolean;
}

const DEFAULT_THRESHOLDS = { critical: 7, warning: 14, info: 30 };

/**
 * Pure hook deriving an expiry warning level from an expiry date.
 * Data source agnostic — callers pass the date (from API, memory, etc.).
 *
 *  - expired:  daysLeft < 0
 *  - critical: daysLeft <= critical threshold (default 7)
 *  - warning:  daysLeft <= warning threshold  (default 14)
 *  - info:     daysLeft <= info threshold     (default 30)
 *  - null:     still far from expiry
 */
export function useExpiryWarning({
  expiresAt,
  thresholds,
}: ExpiryWarningInput): ExpiryWarningResult {
  return useMemo(() => {
    if (!expiresAt) return { level: null, daysLeft: null, isExpired: false };

    const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
    const expiry = expiresAt instanceof Date
      ? new Date(expiresAt)
      : new Date(`${expiresAt}T00:00:00`);
    if (isNaN(expiry.getTime())) {
      return { level: null, daysLeft: null, isExpired: false };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);

    let level: ExpiryLevel = null;
    if (daysLeft < 0) level = 'expired';
    else if (daysLeft <= t.critical) level = 'critical';
    else if (daysLeft <= t.warning) level = 'warning';
    else if (daysLeft <= t.info) level = 'info';

    return { level, daysLeft, isExpired: daysLeft < 0 };
  }, [expiresAt, thresholds]);
}
