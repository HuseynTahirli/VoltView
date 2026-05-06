'use client';

import { cn } from '@/lib/utils';

// Place this once anywhere in the component tree — it declares the SVG filter
// that gives the toggle thumb its liquid merge effect.
export function GooeyFilter() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
    >
      <defs>
        <filter id="liquid-toggle-goo" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant?: 'default' | 'success';
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  variant = 'default',
  disabled,
  className,
}: ToggleProps) {
  const trackBg = checked
    ? variant === 'success'
      ? '#10b981'
      : '#e5e7eb'
    : '#232323';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        className,
      )}
      style={{ background: trackBg, filter: 'url(#liquid-toggle-goo)' }}
    >
      <span
        aria-hidden="true"
        className="absolute rounded-full transition-transform duration-300 ease-in-out"
        style={{
          width: 16,
          height: 16,
          top: 3,
          left: 3,
          background: checked ? '#ffffff' : '#555555',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}
