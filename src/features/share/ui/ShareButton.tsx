'use client';

import { useCallback, useState } from 'react';
import type { ShareableData } from '@/shared/lib/serializer';
import { shareToKakao, isKakaoAvailable } from '../lib/kakao-share';
import type { UserAccount } from '@/shared/types';

interface ShareButtonProps {
  data: ShareableData;
  account: UserAccount | null;
  totalLabel: string;
}

export function ShareButton({ data, account, totalLabel }: ShareButtonProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    setError(null);

    if (!account) {
      setError('계좌 정보를 먼저 입력해주세요.');
      return;
    }

    setSending(true);
    try {
      const available = await isKakaoAvailable();
      if (!available) {
        setError('이 브라우저에서는 공유 기능을 지원하지 않습니다. 텍스트 공유를 이용해주세요.');
        return;
      }

      await shareToKakao({ data, account, totalLabel });
    } catch {
      setError('공유에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSending(false);
    }
  }, [data, account, totalLabel]);

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
