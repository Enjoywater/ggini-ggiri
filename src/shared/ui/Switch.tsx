'use client';

import { forwardRef, useId } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, label, disabled = false, id }, ref) => {
    const generatedId = useId();
    const switchId = id || generatedId;

    return (
      <div className="flex items-center gap-3">
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`
            relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center
            rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${checked ? 'bg-primary' : 'bg-border'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 rounded-full
              bg-white shadow-sm ring-0
              transition-transform duration-200 ease-in-out
              ${checked ? 'translate-x-5' : 'translate-x-0.5'}
            `}
          />
        </button>
        {label && (
          <label
            htmlFor={switchId}
            className={`text-sm font-medium cursor-pointer ${
              disabled ? 'text-text-muted' : 'text-text-primary'
            }`}
          >
            {label}
          </label>
        )}
      </div>
    );
  },
);

Switch.displayName = 'Switch';
