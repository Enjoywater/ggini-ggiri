import { nanoid } from 'nanoid';
import { loadKakaoSDK, isKakaoSDKReady } from '@/shared/lib/kakao-sdk';
import { saveShare } from '@/shared/lib/share-store';
import type { ShareableData } from '@/shared/lib/serializer';
import type { UserAccount, Member } from '@/shared/types';
import { formatAmount } from '@/shared/lib';
import type { Transfer } from '@/features/calculate';

const APP_URL_BASE = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://ggini-ggiri.vercel.app';

interface CreateShareOptions {
  data: ShareableData;
  transfers: Transfer[];
  members: Member[];
  account: UserAccount | null;
  totalLabel: string;
}

/**
 * 카카오톡 Feed 템플릿으로 정산 내역 공유
 * - sendDefault()를 사용자 제스처 컨텍스트 내에서 즉시 호출
 * - Supabase 저장은 백그라운드에서 fire-and-forget
 */
export async function shareToKakao({
  data,
  transfers,
  members,
  account,
  totalLabel,
}: CreateShareOptions): Promise<void> {
  // SDK가 아직 준비되지 않은 경우 fallback (프리로드 미완료 시)
  if (!isKakaoSDKReady()) {
    await loadKakaoSDK();
  }

  // ID를 동기적으로 생성하여 async gap 제거
  const shareId = nanoid(10);
  const detailUrl = `${APP_URL_BASE}/detail?id=${shareId}`;
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const lines: string[] = [];

  for (const t of transfers) {
    const from = memberMap.get(t.from) ?? '?';
    const to = memberMap.get(t.to) ?? '?';
    lines.push(`${from} → ${to} : ${formatAmount(t.amount)}`);
  }

  if (account) {
    lines.push('', `[입금계좌] ${account.bankName} ${account.accountNumber}`);
    lines.push(`예금주: ${account.ownerName}`);
  }

  // 사용자 제스처 컨텍스트 유지 상태에서 즉시 호출
  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: `끼니끼리 정산 | 총 ${totalLabel}`,
      description: lines.join('\n'),
      imageUrl: `${APP_URL_BASE}/icons/icon-512.png`,
      link: {
        mobileWebUrl: detailUrl,
        webUrl: detailUrl,
      },
    },
    buttons: [
      {
        title: '정산 내역 보기',
        link: {
          mobileWebUrl: detailUrl,
          webUrl: detailUrl,
        },
      },
    ],
  });

  // 백그라운드 저장 (1회 재시도 포함) — 실패해도 카카오 공유는 이미 완료
  saveShare(data, shareId).catch((err) => {
    console.error('[ggini-ggiri] 정산 데이터 저장 실패:', err);
  });
}

/**
 * 카카오톡 공유 가능 여부 확인 (동기)
 */
export function isKakaoAvailable(): boolean {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
}
