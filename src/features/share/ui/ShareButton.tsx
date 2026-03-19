'use client';

import { useCallback, useEffect, useState } from 'react';
import { shareToKakao, isKakaoAvailable } from '../lib/kakao-share';
import { loadKakaoSDK } from '@/shared/lib/kakao-sdk';
import type { ShareableData } from '@/shared/lib/serializer';
import type { UserAccount, Member } from '@/shared/types';
import type { Transfer } from '@/features/calculate';

interface ShareButtonProps {
  data: ShareableData;
  transfers: Transfer[];
  members: Member[];
  account: UserAccount | null;
  totalLabel: string;
}

export function ShareButton({ data, transfers, members, account, totalLabel }: ShareButtonProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 마운트 시 SDK 프리로드 (fire-and-forget)
  useEffect(() => {
    if (isKakaoAvailable()) {
      loadKakaoSDK().catch(() => {});
    }
  }, []);

  const handleShare = useCallback(async () => {
    setError(null);
    setSending(true);
    try {
      const available = isKakaoAvailable();
      if (!available) {
        setError('카카오톡 공유를 사용할 수 없습니다. 텍스트 공유를 이용해주세요.');
        return;
      }

      await shareToKakao({ data, transfers, members, account, totalLabel });
    } catch {
      setError('공유에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSending(false);
    }
  }, [data, transfers, members, account, totalLabel]);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={sending}
        className="w-full rounded-xl bg-[#FEE500] px-6 py-3 text-sm font-semibold text-[#191919] transition-opacity disabled:opacity-50"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
            <path d="M9 1C4.58 1 1 3.87 1 7.35c0 2.17 1.4 4.08 3.55 5.18l-.9 3.3a.25.25 0 0 0 .38.28l3.73-2.48c.4.05.81.07 1.24.07 4.42 0 8-2.87 8-6.35S13.42 1 9 1z" fill="currentColor"/>
          </svg>
          {sending ? '공유 중...' : '카카오톡으로 공유'}
        </span>
      </button>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
