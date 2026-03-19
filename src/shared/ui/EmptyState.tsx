import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  illustration?: 'members' | 'sessions' | 'history';
  icon?: ReactNode;
  message: string;
  cta?: { label: string; onClick: () => void };
  className?: string;
}

const illustrations: Record<string, ReactNode> = {
  members: (
    <svg aria-hidden="true" focusable="false" width="64" height="64" viewBox="0 0 64 64" fill="none" className="text-text-muted">
      <circle cx="22" cy="24" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="42" cy="24" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M8 52c0-8 6-14 14-14h4c2 0 4 .5 6 1.5 2-1 4-1.5 6-1.5h4c8 0 14 6 14 14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  sessions: (
    <svg aria-hidden="true" focusable="false" width="64" height="64" viewBox="0 0 64 64" fill="none" className="text-text-muted">
      <rect x="14" y="8" width="36" height="48" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="22" y1="20" x2="42" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="28" x2="38" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="36" x2="34" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="44" x2="30" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  history: (
    <svg aria-hidden="true" focusable="false" width="64" height="64" viewBox="0 0 64 64" fill="none" className="text-text-muted">
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2" fill="none"/>
      <polyline points="32,18 32,32 42,38" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

export function EmptyState({ illustration, icon, message, cta, className = '' }: EmptyStateProps) {
  const visual = icon ?? (illustration ? illustrations[illustration] : null);

  return (
    <div className={`flex flex-col items-center gap-3 py-4 ${className}`}>
      {visual}
      <p className="text-sm text-text-muted text-center animate-breathing">{message}</p>
      {cta && (
        <Button variant="secondary" size="sm" onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
    </div>
  );
}
