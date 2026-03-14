'use client';

import type { ReactNode } from 'react';

interface FormFieldProps {
  label?: string;
  error?: string | null;
  children: ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col">
      {label && (
        <span className="text-sm font-medium text-text-secondary mb-1">
          {label}
        </span>
      )}
      {children}
      {error && (
        <p className="text-xs text-danger-dark mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
