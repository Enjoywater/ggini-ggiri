import type { HTMLAttributes, ReactNode } from 'react';
import type { PastelColor } from '@/shared/lib/constants';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  accentColor?: PastelColor;
}

const accentBorderMap: Record<string, string> = {
  pink: 'border-l-4 border-l-pastel-pink-dark',
  lavender: 'border-l-4 border-l-pastel-lavender-dark',
  mint: 'border-l-4 border-l-pastel-mint-dark',
  sky: 'border-l-4 border-l-pastel-sky-dark',
  peach: 'border-l-4 border-l-pastel-peach-dark',
};

export function Card({ children, className = '', accentColor, ...props }: CardProps) {
  const accentClass = accentColor ? accentBorderMap[accentColor] ?? '' : '';
  return (
    <div
      className={`rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm ${accentClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: Omit<CardProps, 'accentColor'>) {
  return (
    <div className={`mb-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
      {children}
    </h3>
  );
}
