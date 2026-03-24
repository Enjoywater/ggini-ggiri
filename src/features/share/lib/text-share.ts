import type { Member, Session, SettlementResult, UserAccount, Transfer } from '@/shared/types';
import { formatAmount } from '@/shared/lib';

interface TextShareOptions {
  transfers: Transfer[];
  members: Member[];
  account: UserAccount | null;
  totalLabel: string;
  sessions?: Session[];
  results?: SettlementResult[];
}

/** 정산 결과를 텍스트로 생성 */
export function buildSettlementText({
  transfers,
  members,
  account,
  totalLabel,
  sessions,
  results,
}: TextShareOptions): string {
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const lines: string[] = [
    '[끼니끼리 정산]',
    `총 ${totalLabel}`,
  ];

  // 세션별 요약 (납득성 근거 제공)
  if (sessions && sessions.length > 0) {
    lines.push('', '[세션별 내역]');
    for (const session of sessions) {
      const payerName = memberMap.get(session.payerId) ?? '?';
      lines.push(`${session.title} ${formatAmount(session.totalAmount)} (결제: ${payerName})`);
    }
  }

  // 개인별 부담액 요약 (납득성 근거 제공)
  if (results && results.length > 0) {
    lines.push('', '[개인별 부담액]');
    for (const r of results) {
      lines.push(`${r.memberName}: ${formatAmount(r.totalAmount)}`);
    }
  }

  lines.push(
    '',
    '[송금 요약]',
    ...transfers.map(
      (t) =>
        `${memberMap.get(t.from) ?? '?'} → ${memberMap.get(t.to) ?? '?'} : ${formatAmount(t.amount)}`,
    ),
  );

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
