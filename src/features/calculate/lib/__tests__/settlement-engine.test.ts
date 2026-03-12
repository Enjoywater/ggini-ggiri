import { describe, it, expect } from 'vitest';
import Big from 'big.js';
import type { Member, Session } from '@/shared/types';
import {
  calculateSessionShare,
  calculateAlcoholShare,
  calculateBalance,
  optimizeTransfers,
  settle,
} from '../settlement-engine';
import { floor100, adjustRemainder } from '../rounding';

// ── 헬퍼 ──

function makeMember(id: string, name: string): Member {
  return { id, name };
}

const members4: Member[] = [
  makeMember('A', '앨리스'),
  makeMember('B', '밥'),
  makeMember('C', '찰리'),
  makeMember('D', '다이안'),
];

// ── floor100 ──

describe('floor100', () => {
  it('정확히 100 단위인 금액은 변하지 않음', () => {
    expect(floor100(new Big(12300)).toNumber()).toBe(12300);
  });

  it('100원 미만 절사', () => {
    expect(floor100(new Big(12345)).toNumber()).toBe(12300);
  });

  it('99원 → 0원', () => {
    expect(floor100(new Big(99)).toNumber()).toBe(0);
  });

  it('소수점 포함 금액 절사', () => {
    expect(floor100(new Big(12567.89)).toNumber()).toBe(12500);
  });

  it('0원 처리', () => {
    expect(floor100(new Big(0)).toNumber()).toBe(0);
  });
});

// ── adjustRemainder ──

describe('adjustRemainder', () => {
  it('절사 차액을 Payer에게 가감하여 합계가 총액과 일치', () => {
    const shares = new Map<string, Big>([
      ['A', new Big(12300)],
      ['B', new Big(12300)],
      ['C', new Big(12300)],
    ]);
    const total = new Big(37000);
    const adjusted = adjustRemainder(shares, 'A', total);

    let sum = new Big(0);
    for (const v of adjusted.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(37000);
    // Payer(A) 가 차액 100원을 추가 부담
    expect(adjusted.get('A')!.toNumber()).toBe(12400);
  });

  it('차액이 0이면 변동 없음', () => {
    const shares = new Map<string, Big>([
      ['A', new Big(10000)],
      ['B', new Big(10000)],
    ]);
    const adjusted = adjustRemainder(shares, 'A', new Big(20000));
    expect(adjusted.get('A')!.toNumber()).toBe(10000);
    expect(adjusted.get('B')!.toNumber()).toBe(10000);
  });
});

// ── calculateSessionShare ──

describe('calculateSessionShare', () => {
  it('기본 정산: 4명 동일 참여, 주류 없음', () => {
    const session: Session = {
      id: 's1',
      title: '1차 고기집',
      totalAmount: 100000,
      payerId: 'A',
      participantIds: ['A', 'B', 'C', 'D'],
    };
    const share = calculateSessionShare(session);
    expect(share.toNumber()).toBe(25000);
  });

  it('주류 포함 시 기본 부담액에서 술값 제외', () => {
    const session: Session = {
      id: 's1',
      title: '2차 술집',
      totalAmount: 120000,
      payerId: 'A',
      participantIds: ['A', 'B', 'C', 'D'],
      alcohol: { unitPrice: 5000, quantity: 4, drinkerIds: ['A', 'B', 'C'] },
    };
    // 기본 부담액 = (120000 - 20000) / 4 = 25000
    const share = calculateSessionShare(session);
    expect(share.toNumber()).toBe(25000);
  });

  it('참여자 0명이면 0 반환', () => {
    const session: Session = {
      id: 's1',
      title: 'empty',
      totalAmount: 50000,
      payerId: 'A',
      participantIds: [],
    };
    expect(calculateSessionShare(session).toNumber()).toBe(0);
  });
});

// ── calculateAlcoholShare ──

describe('calculateAlcoholShare', () => {
  it('음주자 3명에 술값 20000원 → 1인당 약 6666.67', () => {
    const session: Session = {
      id: 's1',
      title: '술집',
      totalAmount: 120000,
      payerId: 'A',
      participantIds: ['A', 'B', 'C', 'D'],
      alcohol: { unitPrice: 5000, quantity: 4, drinkerIds: ['A', 'B', 'C'] },
    };
    const share = calculateAlcoholShare(session);
    // 20000 / 3 ≈ 6666.666...
    expect(Number(share.toFixed(2))).toBeCloseTo(6666.67, 1);
  });

  it('주류 정보 없으면 0', () => {
    const session: Session = {
      id: 's1',
      title: '고기집',
      totalAmount: 100000,
      payerId: 'A',
      participantIds: ['A', 'B', 'C', 'D'],
    };
    expect(calculateAlcoholShare(session).toNumber()).toBe(0);
  });

  it('음주자 0명이면 0', () => {
    const session: Session = {
      id: 's1',
      title: '술집',
      totalAmount: 100000,
      payerId: 'A',
      participantIds: ['A', 'B', 'C', 'D'],
      alcohol: { unitPrice: 5000, quantity: 4, drinkerIds: [] },
    };
    expect(calculateAlcoholShare(session).toNumber()).toBe(0);
  });
});

// ── calculateBalance: 기본 정산 (4명 동일 참여) ──

describe('calculateBalance - 기본 정산 (4명 동일 참여)', () => {
  it('결제자만 양수 잔액, 나머지는 음수', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차',
        totalAmount: 100000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D'],
      },
    ];
    const balances = calculateBalance(sessions, members4);
    // A가 100000 지불, 1인당 25000
    // A: 100000 - 25000 = 75000 (받을 돈)
    // B,C,D: 0 - 25000 = -25000 (보낼 돈)
    expect(balances.get('A')!.toNumber()).toBe(75000);
    expect(balances.get('B')!.toNumber()).toBe(-25000);
    expect(balances.get('C')!.toNumber()).toBe(-25000);
    expect(balances.get('D')!.toNumber()).toBe(-25000);
  });

  it('잔액 합계는 0', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차',
        totalAmount: 100000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D'],
      },
    ];
    const balances = calculateBalance(sessions, members4);
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });
});

// ── calculateBalance: 가변 인원 (1차 4명, 2차 3명) ──

describe('calculateBalance - 가변 인원 (1차 4명, 2차 3명)', () => {
  it('2차에 불참한 D는 1차 부담만 존재', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차',
        totalAmount: 100000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D'],
      },
      {
        id: 's2',
        title: '2차',
        totalAmount: 90000,
        payerId: 'B',
        participantIds: ['A', 'B', 'C'],
      },
    ];
    const balances = calculateBalance(sessions, members4);

    // 1차: 1인당 25000 (A 결제)
    // 2차: 1인당 30000 (B 결제)
    // A: paid 100000, burden 25000+30000=55000, balance=45000
    // B: paid 90000, burden 25000+30000=55000, balance=35000
    // C: paid 0, burden 25000+30000=55000, balance=-55000
    // D: paid 0, burden 25000, balance=-25000
    expect(balances.get('A')!.toNumber()).toBe(45000);
    expect(balances.get('B')!.toNumber()).toBe(35000);
    expect(balances.get('C')!.toNumber()).toBe(-55000);
    expect(balances.get('D')!.toNumber()).toBe(-25000);
  });

  it('잔액 합계는 0', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차',
        totalAmount: 100000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D'],
      },
      {
        id: 's2',
        title: '2차',
        totalAmount: 90000,
        payerId: 'B',
        participantIds: ['A', 'B', 'C'],
      },
    ];
    const balances = calculateBalance(sessions, members4);
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });
});

// ── calculateBalance: 주류 포함 정산 ──

describe('calculateBalance - 주류 포함 정산', () => {
  it('비음주자(D)는 술값을 부담하지 않음', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '술집',
        totalAmount: 120000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D'],
        alcohol: { unitPrice: 5000, quantity: 4, drinkerIds: ['A', 'B', 'C'] },
      },
    ];
    const balances = calculateBalance(sessions, members4);

    // 기본: (120000-20000)/4 = 25000
    // 술값: 20000/3 ≈ 6666.67
    // 음주자 부담: 25000 + 6666.67 = 31666.67 → floor100 = 31600
    // 비음주자 부담: 25000 → floor100 = 25000
    // 절사 합: 31600*3 + 25000 = 119800
    // 차액: 120000 - 119800 = 200 → Payer(A)에게 가산
    // A 최종 부담: 31600 + 200 = 31800
    expect(balances.get('D')!.toNumber()).toBe(-25000);
    // D는 순수 기본 부담만
  });

  it('잔액 합계는 0 (절사 보정 검증)', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '술집',
        totalAmount: 120000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D'],
        alcohol: { unitPrice: 5000, quantity: 4, drinkerIds: ['A', 'B', 'C'] },
      },
    ];
    const balances = calculateBalance(sessions, members4);
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });
});

// ── optimizeTransfers ──

describe('optimizeTransfers', () => {
  it('최소 송금 동선 최적화', () => {
    const balances = new Map<string, Big>([
      ['A', new Big(75000)],
      ['B', new Big(-25000)],
      ['C', new Big(-25000)],
      ['D', new Big(-25000)],
    ]);
    const transfers = optimizeTransfers(balances);

    // 3명이 A에게 각 25000 송금
    expect(transfers.length).toBe(3);

    const totalTransferred = transfers.reduce((s, t) => s + t.amount, 0);
    expect(totalTransferred).toBe(75000);

    // 모든 송금 대상이 A
    for (const t of transfers) {
      expect(t.to).toBe('A');
      expect(t.amount).toBe(25000);
    }
  });

  it('복수 결제자의 최적 동선', () => {
    // A: +45000, B: +35000, C: -55000, D: -25000
    const balances = new Map<string, Big>([
      ['A', new Big(45000)],
      ['B', new Big(35000)],
      ['C', new Big(-55000)],
      ['D', new Big(-25000)],
    ]);
    const transfers = optimizeTransfers(balances);

    // 송금 총액 = 80000
    const totalTransferred = transfers.reduce((s, t) => s + t.amount, 0);
    expect(totalTransferred).toBe(80000);

    // 잔액 검증: 모든 잔액이 0으로 수렴
    const remaining = new Map<string, Big>([
      ['A', new Big(45000)],
      ['B', new Big(35000)],
      ['C', new Big(-55000)],
      ['D', new Big(-25000)],
    ]);
    for (const t of transfers) {
      remaining.set(t.to, remaining.get(t.to)!.minus(t.amount));
      remaining.set(t.from, remaining.get(t.from)!.plus(t.amount));
    }
    for (const v of remaining.values()) {
      expect(v.toNumber()).toBe(0);
    }
  });

  it('잔액이 모두 0이면 송금 없음', () => {
    const balances = new Map<string, Big>([
      ['A', new Big(0)],
      ['B', new Big(0)],
    ]);
    expect(optimizeTransfers(balances)).toEqual([]);
  });
});

// ── 엣지 케이스 ──

describe('엣지 케이스', () => {
  it('1인 참여 세션: 결제자 본인만 참여', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '혼밥',
        totalAmount: 15000,
        payerId: 'A',
        participantIds: ['A'],
      },
    ];
    const members = [makeMember('A', '앨리스')];
    const balances = calculateBalance(sessions, members);

    // A가 결제하고 A만 참여 → 잔액 0
    expect(balances.get('A')!.toNumber()).toBe(0);
  });

  it('결제자가 참여자가 아닌 경우', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '후배 간식',
        totalAmount: 30000,
        payerId: 'A',
        participantIds: ['B', 'C', 'D'],
      },
    ];
    const balances = calculateBalance(sessions, members4);

    // A가 30000 결제, 참여하지 않음 → 부담액 0, 잔액 +30000
    // B,C,D 각 10000 부담
    expect(balances.get('A')!.toNumber()).toBe(30000);
    expect(balances.get('B')!.toNumber()).toBe(-10000);
    expect(balances.get('C')!.toNumber()).toBe(-10000);
    expect(balances.get('D')!.toNumber()).toBe(-10000);
  });

  it('나누어 떨어지지 않는 금액의 절사 보정', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '카페',
        totalAmount: 13333,
        payerId: 'A',
        participantIds: ['A', 'B', 'C'],
      },
    ];
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
      makeMember('C', '찰리'),
    ];
    const balances = calculateBalance(sessions, members);

    // 1인당: 13333/3 ≈ 4444.33 → floor100 = 4400
    // 절사 합: 4400*3 = 13200
    // 차액: 13333 - 13200 = 133 → Payer(A) 추가 부담
    // A 부담: 4400+133=4533, 지출 13333, 잔액: 13333-4533=8800
    // B,C 부담: 4400, 잔액: -4400
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });

  it('settle()이 올바른 SettlementResult 구조를 반환', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차',
        totalAmount: 100000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D'],
      },
    ];
    const results = settle(sessions, members4);
    expect(results.length).toBe(4);

    const aliceResult = results.find((r) => r.memberId === 'A')!;
    expect(aliceResult.memberName).toBe('앨리스');
    expect(aliceResult.details.length).toBe(1);
    expect(aliceResult.details[0].sessionTitle).toBe('1차');
    expect(aliceResult.details[0].baseAmount).toBe(25000);
    expect(aliceResult.details[0].alcoholAmount).toBe(0);
    expect(aliceResult.details[0].subtotal).toBe(25000);
  });
});
