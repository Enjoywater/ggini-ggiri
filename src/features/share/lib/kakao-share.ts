import { loadKakaoSDK } from '@/shared/lib/kakao-sdk';
import type { UserAccount, Member } from '@/shared/types';
import type { Transfer } from '@/features/calculate';

const APP_URL_BASE = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://ggini-ggiri.app';

interface CreateShareOptions {
  transfers: Transfer[];
  members: Member[];
  account: UserAccount | null;
  totalLabel: string;
}

/**
 * 카카오톡 Feed 템플릿으로 정산 내역 공유
 * - 카드 description에 송금 요약을 포함하여 클릭 없이 내용 확인 가능
 */
export async function shareToKakao({
  transfers,
  members,
  account,
  totalLabel,
}: CreateShareOptions): Promise<void> {
  await loadKakaoSDK();

  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const lines: string[] = [];

  // 송금 요약
  for (const t of transfers) {
    const from = memberMap.get(t.from) ?? '?';
    const to = memberMap.get(t.to) ?? '?';
    lines.push(`${from} → ${to} : ${t.amount.toLocaleString('ko-KR')}원`);
  }

  // 계좌 정보
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
        mobileWebUrl: APP_URL_BASE,
        webUrl: APP_URL_BASE,
      },
    },
  });
}

/**
 * 카카오톡 공유 가능 여부 확인
 */
export async function isKakaoAvailable(): Promise<boolean> {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
}
