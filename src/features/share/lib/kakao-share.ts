import { loadKakaoSDK } from '@/shared/lib/kakao-sdk';
import { saveShare } from '@/shared/lib/share-store';
import type { ShareableData } from '@/shared/lib/serializer';
import type { UserAccount, Member } from '@/shared/types';
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
 * - Supabase에 데이터 저장 후 짧은 ID로 detail 링크 생성
 * - 카드 description에 송금 요약 포함
 */
export async function shareToKakao({
  data,
  transfers,
  members,
  account,
  totalLabel,
}: CreateShareOptions): Promise<void> {
  const [, shareId] = await Promise.all([
    loadKakaoSDK(),
    saveShare(data),
  ]);

  const detailUrl = `${APP_URL_BASE}/detail?id=${shareId}`;
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const lines: string[] = [];

  for (const t of transfers) {
    const from = memberMap.get(t.from) ?? '?';
    const to = memberMap.get(t.to) ?? '?';
    lines.push(`${from} → ${to} : ${t.amount.toLocaleString('ko-KR')}원`);
  }

  if (account) {
    lines.push('', `[입금계좌] ${account.bankName} ${account.accountNumber}`);
    lines.push(`예금주: ${account.ownerName}`);
  }

  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: `끼니끼리 정산 | 총 ${totalLabel}`,
      description: lines.join('\n'),
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
}

/**
 * 카카오톡 공유 가능 여부 확인
 */
export async function isKakaoAvailable(): Promise<boolean> {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
}
