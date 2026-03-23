import type { Member, Session } from '@/shared/types';

/** 타임스탬프를 YYYY.MM.DD 형식으로 변환 */
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/** 금액에 천 단위 구분자를 붙임 (원 단위 없음) */
export function formatAmountPlain(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

/** 금액에 천 단위 구분자와 원 단위를 붙임 */
export function formatAmount(amount: number): string {
  return formatAmountPlain(amount) + '원';
}

/** 가장 많이 결제한 참여자(Main Payer)를 찾음 */
export function findMainPayer(sessions: Session[], members: Member[]): Member | undefined {
  const payerMap = new Map<string, number>();
  for (const session of sessions) {
    const prev = payerMap.get(session.payerId) || 0;
    payerMap.set(session.payerId, prev + session.totalAmount);
  }
  let maxId = '';
  let maxAmount = 0;
  for (const [id, amount] of payerMap) {
    if (amount > maxAmount) {
      maxId = id;
      maxAmount = amount;
    }
  }
  return members.find((m) => m.id === maxId);
}
