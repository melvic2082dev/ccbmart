'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * vi-VN convention:
 *   "." = thousand separator (1.000.000)
 *   "," = decimal separator  (1.000,50)
 * Internal raw value uses "." as decimal ("1000000" or "1000.5").
 */

export function formatMoney(value: number | null | undefined): string {
  if (value == null || value === 0) return '';
  return value.toLocaleString('vi-VN');
}

export function formatMoneyDisplay(value: number | null | undefined): string {
  if (value == null || value === 0) return '—';
  return `${value.toLocaleString('vi-VN')}đ`;
}

function rawToDisplay(raw: string): string {
  if (!raw) return '';
  const dotIdx = raw.indexOf('.');
  if (dotIdx !== -1) {
    const intStr = raw.slice(0, dotIdx);
    const decStr = raw.slice(dotIdx + 1);
    const intNum = parseInt(intStr || '0', 10);
    const intFmt = isNaN(intNum) ? '0' : intNum.toLocaleString('vi-VN');
    return `${intFmt},${decStr}`;
  }
  const num = parseInt(raw, 10);
  return isNaN(num) ? '' : num.toLocaleString('vi-VN');
}

function formatBlur(raw: string, decimalPlaces: number): string {
  const num = parseFloat(raw);
  if (isNaN(num) || raw === '') return '';
  return num.toLocaleString('vi-VN', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
}

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** 0 for VND integers, 2 for USD, 8 for crypto. Undefined = no blur re-format. */
  decimalPlaces?: number;
}

export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  className,
  decimalPlaces,
  disabled,
}: MoneyInputProps) {
  const isInteger = decimalPlaces === 0;

  const toDisplayExternal = (raw: string) => {
    if (isInteger) {
      const num = parseFloat(raw);
      return isNaN(num) || raw === '' ? '' : Math.round(num).toLocaleString('vi-VN');
    }
    if (decimalPlaces !== undefined) return formatBlur(raw, decimalPlaces);
    return rawToDisplay(raw);
  };

  const [display, setDisplay] = useState(() => toDisplayExternal(value ?? ''));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDisplay(toDisplayExternal(value ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (input: string) => {
    let s = input.replace(/\./g, '');
    s = s.replace(/[^\d,]/g, '');

    const commaIdx = s.indexOf(',');
    let intPart: string;
    let decPart: string | undefined;

    if (commaIdx !== -1) {
      intPart = s.slice(0, commaIdx);
      decPart = s.slice(commaIdx + 1).replace(/,/g, '');
    } else {
      intPart = s;
      decPart = undefined;
    }

    const rawOut = decPart !== undefined ? `${intPart || '0'}.${decPart}` : intPart;
    const intNum = parseInt(intPart || '0', 10);
    const intFmt = intPart === '' ? '' : isNaN(intNum) ? '' : intNum.toLocaleString('vi-VN');
    const newDisplay = decPart !== undefined ? `${intFmt},${decPart}` : intFmt;

    setDisplay(newDisplay);
    onChange(rawOut);
  };

  const handleFocus = () => {
    focusedRef.current = true;
  };
  const handleBlur = () => {
    focusedRef.current = false;
    if (decimalPlaces !== undefined) {
      const num = parseFloat(value || '0');
      if (!isNaN(num) && value !== '') setDisplay(formatBlur(value, decimalPlaces));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn('outline-none transition-all', className)}
    />
  );
}
