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

// ═══════════════════════════════════════════════════════
// 1. 정산 엔진 엣지 케이스
// ═══════════════════════════════════════════════════════

describe('엣지 케이스: 참여자 0명 세션', () => {
  it('참여자 0명이면 세션 단가 0, 모든 잔액 합계 0', () => {
    const members = [makeMember('A', '앨리스')];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '빈 세션',
        totalAmount: 50000,
        payerId: 'A',
        participantIds: [],
      },
    ];
    const share = calculateSessionShare(sessions[0]);
    expect(share.toNumber()).toBe(0);

    const balances = calculateBalance(sessions, members);
    // A가 50000 결제, 참여자 0명이므로 부담액 없음
    // adjustRemainder에서 payer 'A'가 shares에 없으므로 차액 50000이 A에 가산
    // 하지만 A의 지출이 50000이므로 잔액은 0이 되어야 함... 아니면 차이가 생기는지 확인
    // 실제로 participantIds가 비어있으면 sessionShares가 비어있고,
    // adjustRemainder가 total 50000 - sum 0 = 50000을 payer에게 추가
    // 그래서 A의 부담 = 50000, 지출 = 50000, 잔액 = 0
    expect(balances.get('A')!.toNumber()).toBe(0);
  });

  it('참여자 0명이면 settle() 결과에 세션 정보 없음', () => {
    const members = [makeMember('A', '앨리스')];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '빈 세션',
        totalAmount: 50000,
        payerId: 'A',
        participantIds: [],
      },
    ];
    const results = settle(sessions, members);
    const aliceResult = results.find((r) => r.memberId === 'A')!;
    // A는 참여자가 아니므로 details가 비어있어야 함
    expect(aliceResult.details.length).toBe(0);
  });
});

describe('엣지 케이스: 참여자 1명 (본인만)', () => {
  it('결제자 = 유일 참여자 → 잔액 0, 송금 없음', () => {
    const members = [makeMember('A', '앨리스')];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '혼밥',
        totalAmount: 15000,
        payerId: 'A',
        participantIds: ['A'],
      },
    ];
    const balances = calculateBalance(sessions, members);
    expect(balances.get('A')!.toNumber()).toBe(0);

    const transfers = optimizeTransfers(balances);
    expect(transfers.length).toBe(0);
  });
});

describe('엣지 케이스: 고액 정산 (1000만원 이상)', () => {
  it('10,000,000원 3인 정산 시 Big.js 정밀도 유지', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
      makeMember('C', '찰리'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '고급 레스토랑',
        totalAmount: 10000000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C'],
      },
    ];
    const balances = calculateBalance(sessions, members);

    // 1인당: 10000000/3 = 3333333.33... → floor100 = 3333300
    // 절사 합: 3333300 * 3 = 9999900
    // 차액: 10000000 - 9999900 = 100 → A에게 가산
    // A 부담: 3333300 + 100 = 3333400
    // A 잔액: 10000000 - 3333400 = 6666600
    expect(balances.get('A')!.toNumber()).toBe(6666600);
    expect(balances.get('B')!.toNumber()).toBe(-3333300);
    expect(balances.get('C')!.toNumber()).toBe(-3333300);

    // 합계 반드시 0
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });

  it('99,999,999원 정산에서도 합계 0 유지', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
      makeMember('C', '찰리'),
      makeMember('D', '다이안'),
      makeMember('E', '이브'),
      makeMember('F', '프랭크'),
      makeMember('G', '그레이스'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '초고액 모임',
        totalAmount: 99999999,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      },
    ];
    const balances = calculateBalance(sessions, members);
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });
});

describe('엣지 케이스: 소액 정산 (100원 미만)', () => {
  it('총액 99원 → 1인당 절사 결과 0원', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '소액',
        totalAmount: 99,
        payerId: 'A',
        participantIds: ['A', 'B'],
      },
    ];
    // 1인당 49.5원 → floor100 = 0원
    // 차액 99 - 0 = 99 → A에게 가산 (payer가 99원 전액 부담)
    const balances = calculateBalance(sessions, members);
    expect(balances.get('A')!.toNumber()).toBe(0); // 99 결제 - 99 부담 = 0
    expect(balances.get('B')!.toNumber()).toBe(0); // 부담 0원
  });

  it('총액 50원 단독 → 잔액 0', () => {
    const members = [makeMember('A', '앨리스')];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '소액 혼밥',
        totalAmount: 50,
        payerId: 'A',
        participantIds: ['A'],
      },
    ];
    const balances = calculateBalance(sessions, members);
    expect(balances.get('A')!.toNumber()).toBe(0);
  });

  it('총액 0원 → 잔액 0', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '무료',
        totalAmount: 0,
        payerId: 'A',
        participantIds: ['A', 'B'],
      },
    ];
    const balances = calculateBalance(sessions, members);
    expect(balances.get('A')!.toNumber()).toBe(0);
    expect(balances.get('B')!.toNumber()).toBe(0);
  });
});

describe('엣지 케이스: 모든 참여자가 음주자', () => {
  it('4명 전원 음주 → 술값이 모든 참여자에게 균등 배분', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
      makeMember('C', '찰리'),
      makeMember('D', '다이안'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '술집',
        totalAmount: 200000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D'],
        alcohol: {
          unitPrice: 10000,
          quantity: 4,
          drinkerIds: ['A', 'B', 'C', 'D'],
        },
      },
    ];
    // 기본: (200000-40000)/4 = 40000
    // 술값: 40000/4 = 10000
    // 1인당: 40000 + 10000 = 50000 → floor100 = 50000
    // 합: 200000 → 차액 0
    const balances = calculateBalance(sessions, members);
    expect(balances.get('A')!.toNumber()).toBe(150000); // 200000 - 50000
    expect(balances.get('B')!.toNumber()).toBe(-50000);
    expect(balances.get('C')!.toNumber()).toBe(-50000);
    expect(balances.get('D')!.toNumber()).toBe(-50000);

    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });
});

describe('엣지 케이스: 음주자 0명인데 술값 ON', () => {
  it('drinkerIds 빈 배열 → 술값 부담자 없음, 기본 정산만 적용', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '술집인데 아무도 안마심',
        totalAmount: 100000,
        payerId: 'A',
        participantIds: ['A', 'B'],
        alcohol: {
          unitPrice: 5000,
          quantity: 4,
          drinkerIds: [], // 음주자 0명
        },
      },
    ];
    const alcoholShare = calculateAlcoholShare(sessions[0]);
    expect(alcoholShare.toNumber()).toBe(0);

    // 기본: (100000-20000)/2 = 40000
    // 술값 배분: 0 (drinkerIds 비어있음)
    // 절사 합: 40000 * 2 = 80000
    // 차액: 100000 - 80000 = 20000 → A에게 가산
    // 이는 술값 20000원을 아무도 부담하지 않으므로 payer가 전액 부담하는 결과
    const balances = calculateBalance(sessions, members);
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });
});

describe('엣지 케이스: 결제자가 참여자가 아닌 경우', () => {
  it('결제자 A가 비참여 → A에게 전액 환불', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
      makeMember('C', '찰리'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '후배 간식',
        totalAmount: 30000,
        payerId: 'A',
        participantIds: ['B', 'C'],
      },
    ];
    const balances = calculateBalance(sessions, members);
    expect(balances.get('A')!.toNumber()).toBe(30000);
    expect(balances.get('B')!.toNumber()).toBe(-15000);
    expect(balances.get('C')!.toNumber()).toBe(-15000);
  });

  it('결제자가 비참여이면서 주류 포함', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
      makeMember('C', '찰리'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '후배 회식',
        totalAmount: 100000,
        payerId: 'A',
        participantIds: ['B', 'C'],
        alcohol: {
          unitPrice: 5000,
          quantity: 4,
          drinkerIds: ['B'],
        },
      },
    ];
    const balances = calculateBalance(sessions, members);
    // 기본: (100000-20000)/2 = 40000
    // 술: 20000/1 = 20000 (B만)
    // B: 40000+20000 = 60000 → floor100 = 60000
    // C: 40000 → floor100 = 40000
    // 합: 100000 → 차액 0 → A 조정 없음
    // 하지만 A는 participantIds에 없으므로 sessionShares에 없고
    // adjustRemainder에서 payerAmount는 0, + 차액이 가감됨
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });
});

describe('엣지 케이스: 동일인 다중 결제', () => {
  it('A가 1차와 2차 모두 결제', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
      makeMember('C', '찰리'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차',
        totalAmount: 90000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C'],
      },
      {
        id: 's2',
        title: '2차',
        totalAmount: 60000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C'],
      },
    ];
    const balances = calculateBalance(sessions, members);
    // 1차: 1인당 30000
    // 2차: 1인당 20000
    // A 지출: 150000, 부담: 50000, 잔액: 100000
    // B 지출: 0, 부담: 50000, 잔액: -50000
    // C 지출: 0, 부담: 50000, 잔액: -50000
    expect(balances.get('A')!.toNumber()).toBe(100000);
    expect(balances.get('B')!.toNumber()).toBe(-50000);
    expect(balances.get('C')!.toNumber()).toBe(-50000);

    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);
  });

  it('여러 세션에 서로 다른 결제자 → 최적 송금', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
      makeMember('C', '찰리'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차',
        totalAmount: 90000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C'],
      },
      {
        id: 's2',
        title: '2차',
        totalAmount: 60000,
        payerId: 'B',
        participantIds: ['A', 'B', 'C'],
      },
    ];
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    // 모든 잔액을 0으로 만드는지 검증
    const remaining = new Map<string, Big>();
    for (const [id, bal] of balances) remaining.set(id, new Big(bal.toNumber()));
    for (const t of transfers) {
      remaining.set(t.to, remaining.get(t.to)!.minus(t.amount));
      remaining.set(t.from, remaining.get(t.from)!.plus(t.amount));
    }
    for (const v of remaining.values()) {
      expect(v.toNumber()).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 2. floor100 및 adjustRemainder 추가 엣지 케이스
// ═══════════════════════════════════════════════════════

describe('floor100 추가 엣지 케이스', () => {
  it('음수 금액 절사', () => {
    // 음수 금액도 절사가 올바르게 동작하는지
    const result = floor100(new Big(-12345));
    // Big.roundDown은 0방향으로 절사하므로 -12300이 될 수 있음
    expect(result.toNumber()).toBe(-12300);
  });

  it('매우 큰 금액 절사', () => {
    expect(floor100(new Big(999999999)).toNumber()).toBe(999999900);
  });

  it('100원 정확히 절사', () => {
    expect(floor100(new Big(100)).toNumber()).toBe(100);
  });

  it('1원 절사', () => {
    expect(floor100(new Big(1)).toNumber()).toBe(0);
  });
});

describe('adjustRemainder 추가 엣지 케이스', () => {
  it('Payer가 shares에 없는 경우 → 새로 추가됨', () => {
    const shares = new Map<string, Big>([
      ['B', new Big(10000)],
      ['C', new Big(10000)],
    ]);
    const adjusted = adjustRemainder(shares, 'A', new Big(30000));
    // A는 shares에 없었지만 차액 10000이 A에게 설정됨
    expect(adjusted.get('A')!.toNumber()).toBe(10000);
  });

  it('빈 shares → Payer에게 전액', () => {
    const shares = new Map<string, Big>();
    const adjusted = adjustRemainder(shares, 'A', new Big(50000));
    expect(adjusted.get('A')!.toNumber()).toBe(50000);
  });
});

// ═══════════════════════════════════════════════════════
// 3. 복합 시나리오
// ═══════════════════════════════════════════════════════

describe('복합 시나리오: 다회차 + 가변인원 + 주류', () => {
  it('3차 모임 (가변 인원 + 주류 혼합) 합계 0 유지', () => {
    const members = [
      makeMember('A', '앨리스'),
      makeMember('B', '밥'),
      makeMember('C', '찰리'),
      makeMember('D', '다이안'),
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차 고기집',
        totalAmount: 200000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C', 'D'],
        alcohol: {
          unitPrice: 8000,
          quantity: 3,
          drinkerIds: ['A', 'B', 'C'],
        },
      },
      {
        id: 's2',
        title: '2차 노래방',
        totalAmount: 80000,
        payerId: 'B',
        participantIds: ['A', 'B', 'C'],
      },
      {
        id: 's3',
        title: '3차 포장마차',
        totalAmount: 45000,
        payerId: 'C',
        participantIds: ['A', 'C'],
        alcohol: {
          unitPrice: 5000,
          quantity: 2,
          drinkerIds: ['A'],
        },
      },
    ];
    const balances = calculateBalance(sessions, members);
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0);

    // 송금 최적화 후에도 정합성 유지
    const transfers = optimizeTransfers(balances);
    const remaining = new Map<string, Big>();
    for (const [id, bal] of balances) remaining.set(id, new Big(bal.toNumber()));
    for (const t of transfers) {
      remaining.set(t.to, remaining.get(t.to)!.minus(t.amount));
      remaining.set(t.from, remaining.get(t.from)!.plus(t.amount));
    }
    for (const v of remaining.values()) {
      expect(v.toNumber()).toBe(0);
    }
  });
});
