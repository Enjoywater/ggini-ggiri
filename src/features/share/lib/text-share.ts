import type { Transfer } from '@/features/calculate';
import type { Member, UserAccount } from '@/shared/types';

interface TextShareOptions {
  transfers: Transfer[];
  members: Member[];
  account: UserAccount | null;
  totalLabel: string;
}

/** 정산 결과를 텍스트로 생성 */
export function buildSettlementText({
  transfers,
  members,
  account,
  totalLabel,
}: TextShareOptions): string {
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const lines: string[] = [
    '[끼니끼리 정산]',
    `총 ${totalLabel}`,
    '',
    ...transfers.map(
      (t) =>
        `${memberMap.get(t.from) ?? '?'} → ${memberMap.get(t.to) ?? '?'} : ${t.amount.toLocaleString('ko-KR')}원`,
    ),
  ];

  if (account) {
    lines.push('', '[입금 계좌]', `${account.bankName} ${account.accountNumber}`, `예금주: ${account.ownerName}`);
  }

  return lines.join('\n');
}

/** Web Share API or clipboard fallback */
export async function shareText(text: string): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw e;
      }
      // share 실패 시 clipboard fallback
    }
  }

  await navigator.clipboard.writeText(text);
  return 'copied';
}
