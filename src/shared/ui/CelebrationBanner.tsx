'use client';

import { CheckAnimation } from './CheckAnimation';

interface CelebrationBannerProps {
  show: boolean;
}

export function CelebrationBanner({ show }: CelebrationBannerProps) {
  if (!show) return null;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--color-pastel-mint)]/30 to-[var(--color-pastel-sky)]/30 px-4 py-4 animate-[celebration-in_500ms_ease-out_both]"
      role="status"
      aria-label="모든 송금 완료"
    >
      <div className="flex-shrink-0">
        <CheckAnimation checked={true} />
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--color-text-primary)]">
          모든 송금이 완료되었습니다!
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          수고하셨습니다
        </p>
      </div>
    </div>
  );
}
