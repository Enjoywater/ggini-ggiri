'use client';

import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, suffix, className = '', id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full rounded-xl border border-border bg-surface-elevated
              px-4 py-2.5 text-base text-text-primary
              placeholder:text-text-muted
              transition-colors duration-150
              focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary/30
              disabled:opacity-50 disabled:bg-surface
              ${suffix ? 'pr-12' : ''}
              ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}
              ${className}
            `}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {suffix && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
