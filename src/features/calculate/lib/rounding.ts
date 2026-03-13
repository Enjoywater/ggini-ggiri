import Big from 'big.js';

/** 10원 단위 절사 (내림) */
export function floor100(amount: Big): Big {
  const num = amount.div(10).round(0, Big.roundDown).times(10);
  return num;
}

/**
 * 절사 차액을 Payer에게 가감하여 합계 0 유지
 *
 * @param shares  - memberId → 절사 적용된 부담액 맵
 * @param payerId - 결제자 ID
 * @param total   - 세션 총액 (Big)
 * @returns 조정된 shares 맵 (합계 === total)
 */
export function adjustRemainder(
  shares: Map<string, Big>,
  payerId: string,
  total: Big,
): Map<string, Big> {
  const result = new Map(shares);

  let sum = new Big(0);
  for (const amount of result.values()) {
    sum = sum.plus(amount);
  }

  const remainder = total.minus(sum);

  if (!remainder.eq(0)) {
    const payerAmount = result.get(payerId) ?? new Big(0);
    result.set(payerId, payerAmount.plus(remainder));
  }

  return result;
}
