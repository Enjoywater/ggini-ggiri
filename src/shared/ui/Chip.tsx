'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  color?: 'pink' | 'lavender' | 'mint' | 'sky' | 'peach';
  role?: string;
}

const colorMap: Record<string, { active: string; inactive: string }> = {
  pink: {
    active: 'bg-pastel-pink border-pastel-pink-dark text-text-primary',
    inactive: 'bg-surface-elevated border-border text-text-secondary',
  },
  lavender: {
    active: 'bg-pastel-lavender border-pastel-lavender-dark text-text-primary',
    inactive: 'bg-surface-elevated border-border text-text-secondary',
  },
  mint: {
    active: 'bg-pastel-mint border-pastel-mint-dark text-text-primary',
    inactive: 'bg-surface-elevated border-border text-text-secondary',
  },
  sky: {
    active: 'bg-pastel-sky border-pastel-sky-dark text-text-primary',
    inactive: 'bg-surface-elevated border-border text-text-secondary',
  },
  peach: {
    active: 'bg-pastel-peach border-pastel-peach-dark text-text-primary',
    inactive: 'bg-surface-elevated border-border text-text-secondary',
  },
};

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      selected = false,
      color = 'sky',
      className = '',
      children,
      role,
      ...props
    },
    ref,
  ) => {
    const styles = colorMap[color];
    const resolvedRole = role ?? 'switch';

    return (
      <button
        ref={ref}
        type="button"
        role={resolvedRole}
        aria-checked={resolvedRole === 'switch' ? selected : undefined}
        aria-pressed={resolvedRole === 'button' ? selected : undefined}
        className={`
          relative inline-flex items-center gap-1.5 rounded-full border
          px-3 py-1.5 text-sm font-medium
          after:absolute after:inset-0 after:-m-[6px] after:content-[""]
          transition-all duration-150 ease-in-out
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
          active:scale-95
          ${selected ? styles.active : styles.inactive}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Chip.displayName = 'Chip';
