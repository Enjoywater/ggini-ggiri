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
        {sending ? '공유 중...' : '카카오톡으로 공유'}
      </button>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
