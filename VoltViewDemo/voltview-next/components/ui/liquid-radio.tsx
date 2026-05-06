'use client';

import * as React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

// SVG filter that gives the items the liquid/glass merge effect
export function GlassFilter() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
      <defs>
        <filter id="glass-blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

interface LiquidRadioOption {
  label: string;
  value: string;
}

interface LiquidRadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: LiquidRadioOption[];
  disabled?: boolean;
  className?: string;
}

export function LiquidRadioGroup({
  value,
  onValueChange,
  options,
  disabled,
  className,
}: LiquidRadioGroupProps) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <GlassFilter />
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className="flex flex-row gap-0 p-0.5 rounded-full relative"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          filter: 'url(#glass-blur)',
        }}
      >
        {options.map(opt => (
          <RadioGroupItem
            key={opt.value}
            value={opt.value}
            id={`liquid-radio-${opt.value}`}
            className="sr-only"
          />
        ))}
        {options.map(opt => {
          const isActive = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={`liquid-radio-${opt.value}`}
              className={cn(
                'relative px-3 py-1 text-[11px] font-medium rounded-full transition-colors duration-200 select-none',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                isActive ? 'text-black' : 'text-neutral-400 hover:text-neutral-200',
              )}
            >
              {isActive && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#ffffff' }}
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
