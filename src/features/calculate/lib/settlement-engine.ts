import Big from 'big.js';
import type { Member, Session, SettlementResult, SessionSettlement } from '@/shared/types';
import { floor100, adjustRemainder } from './rounding';

/** 송금 명세 */
export interface Transfer {
  from: string; // memberId
  to: string;   // memberId
  amount: number;
}

/**
 * 세션의 술값 합계를 계산하되, 총액을 초과하지 않도록 상한 제한
 * 술값(unitPrice × quantity)이 totalAmount보다 크면 totalAmount로 클램핑
 */
function getAlcoholTotal(session: Session): Big {
  if (!session.alcohol) return new Big(0);
  const raw = new Big(session.alcohol.unitPrice).times(session.alcohol.quantity);
  const total = new Big(session.totalAmount);
  return raw.gt(total) ? total : raw;
}

/**
 * 세션별 1인당 기본 부담액 (술값 제외)
 * = (총액 - 술값) / 참여인원
 */
export function calculateSessionShare(session: Session): Big {
  const total = new Big(session.totalAmount);
  const alcoholTotal = getAlcoholTotal(session);
  const base = total.minus(alcoholTotal);
  const participantCount = session.participantIds.length;

  if (participantCount === 0) return new Big(0);
  return base.div(participantCount);
}

/**
 * 세션별 1인당 술값 부담액
 * = (단가 x 수량) / 음주자 수
 * 술값 상한은 getAlcoholTotal()에서 적용
 */
export function calculateAlcoholShare(session: Session): Big {
  if (!session.alcohol || session.alcohol.drinkerIds.length === 0) {
    return new Big(0);
  }
  const alcoholTotal = getAlcoholTotal(session);
  return alcoholTotal.div(session.alcohol.drinkerIds.length);
}

/**
 * 각 참여자의 최종 잔액 계산
 * 잔액 = 부담액 합계 - 본인 지출액(결제액)
 * 양수 → 받아야 할 금액, 음수 → 보내야 할 금액
 *
 * @returns memberId → balance (Big) 맵
 */
export function calculateBalance(
  sessions: Session[],
  members: Member[],
): Map<string, Big> {
  // memberId → 총 부담액 (100원 절사 적용)
  const burdens = new Map<string, Big>();
  // memberId → 총 지출액
  const payments = new Map<string, Big>();

  for (const member of members) {
    burdens.set(member.id, new Big(0));
    payments.set(member.id, new Big(0));
  }

  for (const session of sessions) {
    const baseShare = calculateSessionShare(session);
    const alcoholShare = calculateAlcoholShare(session);

    // 각 참여자별 부담액 산출 (절사 전)
    const sessionShares = new Map<string, Big>();
    for (const pid of session.participantIds) {
      let share = baseShare;
      if (session.alcohol?.drinkerIds.includes(pid)) {
        share = share.plus(alcoholShare);
      }
      sessionShares.set(pid, floor100(share));
    }

    // 절사 차액을 Payer에게 가감
    const adjusted = adjustRemainder(
      sessionShares,
      session.payerId,
      new Big(session.totalAmount),
    );

    // 부담액 누적
    for (const [mid, amount] of adjusted) {
      const prev = burdens.get(mid) ?? new Big(0);
      burdens.set(mid, prev.plus(amount));
    }

    // 결제자의 지출액 누적
    const prevPaid = payments.get(session.payerId) ?? new Big(0);
    payments.set(session.payerId, prevPaid.plus(new Big(session.totalAmount)));
  }

  // 잔액 = 지출액 - 부담액 (양수면 받을 금액, 음수면 보낼 금액)
  const balances = new Map<string, Big>();
  for (const member of members) {
    const paid = payments.get(member.id) ?? new Big(0);
    const burden = burdens.get(member.id) ?? new Big(0);
    balances.set(member.id, paid.minus(burden));
  }

  return balances;
}

/**
 * 최소 송금 동선 최적화 (Greedy 알고리즘)
 * 누가 누구에게 얼마를 보내는지 결정
 */
export function optimizeTransfers(
  balances: Map<string, Big>,
): Transfer[] {
  // 양수(받을 사람)와 음수(보낼 사람) 분리
  const creditors: { id: string; amount: Big }[] = [];
  const debtors: { id: string; amount: Big }[] = [];

  for (const [id, balance] of balances) {
    if (balance.gt(0)) {
      creditors.push({ id, amount: balance });
    } else if (balance.lt(0)) {
      debtors.push({ id, amount: balance.abs() });
    }
  }

  // 금액 내림차순 정렬 (큰 금액부터 매칭)
  creditors.sort((a, b) => (b.amount.gt(a.amount) ? 1 : -1));
  debtors.sort((a, b) => (b.amount.gt(a.amount) ? 1 : -1));

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transferAmount = creditor.amount.lt(debtor.amount)
      ? creditor.amount
      : debtor.amount;

    if (transferAmount.gt(0)) {
      transfers.push({
        from: debtor.id,
        to: creditor.id,
        amount: Number(transferAmount),
      });
    }

    creditor.amount = creditor.amount.minus(transferAmount);
    debtor.amount = debtor.amount.minus(transferAmount);

    if (creditor.amount.eq(0)) ci++;
    if (debtor.amount.eq(0)) di++;
  }

  return transfers;
}

/**
 * 세션별 각 참여자의 조정된 부담액 맵을 반환 (adjustRemainder 적용)
 * calculateBalance()와 동일한 절사 보정 로직을 공유하기 위해 추출
 */
function getAdjustedSessionShares(session: Session): Map<string, Big> {
  const baseShare = calculateSessionShare(session);
  const alcoholShare = calculateAlcoholShare(session);

  const sessionShares = new Map<string, Big>();
  for (const pid of session.participantIds) {
    let share = baseShare;
    if (session.alcohol?.drinkerIds.includes(pid)) {
      share = share.plus(alcoholShare);
    }
    sessionShares.set(pid, floor100(share));
  }

  return adjustRemainder(
    sessionShares,
    session.payerId,
    new Big(session.totalAmount),
  );
}

/**
 * 전체 정산 결과를 SettlementResult[] 형태로 산출
 */
export function settle(
  sessions: Session[],
  members: Member[],
): SettlementResult[] {
  // 세션별 조정된 부담액 맵을 미리 계산 (calculateBalance()와 동일 로직)
  const adjustedSharesBySession = sessions.map((s) => ({
    session: s,
    shares: getAdjustedSessionShares(s),
  }));

  const results: SettlementResult[] = [];

  for (const member of members) {
    const details: SessionSettlement[] = [];
    let memberTotal = new Big(0);

    for (const { session, shares } of adjustedSharesBySession) {
      if (!session.participantIds.includes(member.id)) continue;

      const adjustedSubtotal = shares.get(member.id) ?? new Big(0);

      // 표시용 개별 항목 (baseAmount, alcoholAmount)은 절사 기준으로 표시
      const baseShare = calculateSessionShare(session);
      const alcoholShare =
        session.alcohol?.drinkerIds.includes(member.id)
          ? calculateAlcoholShare(session)
          : new Big(0);

      memberTotal = memberTotal.plus(adjustedSubtotal);

      details.push({
        sessionId: session.id,
        sessionTitle: session.title,
        baseAmount: Number(floor100(baseShare)),
        alcoholAmount: Number(floor100(alcoholShare)),
        subtotal: Number(adjustedSubtotal),
      });
    }

    results.push({
      memberId: member.id,
      memberName: member.name,
      totalAmount: Number(memberTotal),
      details,
    });
  }

  return results;
}
