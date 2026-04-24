'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CurrencyPickerProps {
  value: string;
  onChange: (currency: string) => void;
  presets: string[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Pills for common currencies + free-text input for custom codes.
 * - Click a pill → select preset
 * - Type in the input → uppercase alphanumeric custom code
 */
export function CurrencyPicker({
  value,
  onChange,
  presets,
  disabled,
  placeholder = 'Mã khác...',
  className,
}: CurrencyPickerProps) {
  const isCustom = value !== '' && !presets.includes(value);
  const [inputVal, setInputVal] = useState(isCustom ? value : '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const custom = value !== '' && !presets.includes(value);
    setInputVal(custom ? value : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function selectPreset(c: string) {
    setInputVal('');
    onChange(c);
  }

  function handleInputChange(raw: string) {
    const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setInputVal(upper);
    if (upper.length >= 2) onChange(upper);
    else if (upper === '') {
      if (presets.includes(value)) return;
      onChange('');
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => selectPreset(c)}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50',
              value === c && !inputVal
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputVal}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          maxLength={10}
          className={cn(
            'w-full px-3 py-2 text-sm border rounded-xl outline-none transition-all bg-white',
            'placeholder:text-gray-300',
            inputVal
              ? 'border-emerald-400 ring-2 ring-emerald-500/20 font-semibold text-emerald-700'
              : 'border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        {inputVal && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-medium">
            tùy chỉnh
          </span>
        )}
      </div>
    </div>
  );
}
