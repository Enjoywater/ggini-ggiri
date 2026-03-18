import { describe, it, expect } from 'vitest';
import { formatDate, formatAmount, findMainPayer } from '@/shared/lib/formatters';
import type { Member, Session } from '@/shared/types';

// ═══════════════════════════════════════════════════════
// HistoryPage 포맷터 함수 테스트
// ═══════════════════════════════════════════════════════

describe('formatDate', () => {
  it('타임스탬프를 YYYY.MM.DD 형식으로 변환', () => {
    // 2024-03-12T00:00:00.000Z
    const timestamp = new Date(2024, 2, 12).getTime();
    expect(formatDate(timestamp)).toBe('2024.03.12');
  });

  it('월과 일이 한 자리 숫자일 때 0을 패딩', () => {
    const timestamp = new Date(2024, 0, 5).getTime(); // 2024-01-05
    expect(formatDate(timestamp)).toBe('2024.01.05');
  });

  it('12월 31일을 올바르게 처리', () => {
    const timestamp = new Date(2024, 11, 31).getTime();
    expect(formatDate(timestamp)).toBe('2024.12.31');
  });

  it('1월 1일을 올바르게 처리', () => {
    const timestamp = new Date(2025, 0, 1).getTime();
    expect(formatDate(timestamp)).toBe('2025.01.01');
  });

  it('두 자리 월과 일을 올바르게 처리', () => {
    const timestamp = new Date(2024, 9, 15).getTime(); // 2024-10-15
    expect(formatDate(timestamp)).toBe('2024.10.15');
  });
});

describe('formatAmount', () => {
  it('금액에 원 단위를 붙임', () => {
    expect(formatAmount(50000)).toBe('50,000원');
  });

  it('0원을 올바르게 처리', () => {
    expect(formatAmount(0)).toBe('0원');
  });

  it('큰 금액에 천 단위 구분자를 삽입', () => {
    expect(formatAmount(1000000)).toBe('1,000,000원');
  });

  it('천 미만 금액은 구분자 없음', () => {
    expect(formatAmount(999)).toBe('999원');
  });

  it('정확히 1000원을 올바르게 처리', () => {
    expect(formatAmount(1000)).toBe('1,000원');
  });
});

// ═══════════════════════════════════════════════════════
// findMainPayer 테스트
// ═══════════════════════════════════════════════════════

const members: Member[] = [
  { id: 'A', name: '앨리스' },
  { id: 'B', name: '밥' },
  { id: 'C', name: '찰리' },
];

describe('findMainPayer', () => {
  it('가장 많이 결제한 멤버를 반환', () => {
    const sessions: Session[] = [
      { id: 's1', title: '1차', totalAmount: 100000, payerId: 'A', participantIds: ['A', 'B'] },
      { id: 's2', title: '2차', totalAmount: 50000, payerId: 'B', participantIds: ['A', 'B'] },
      { id: 's3', title: '3차', totalAmount: 30000, payerId: 'A', participantIds: ['A', 'B'] },
    ];

    const result = findMainPayer(sessions, members);
    expect(result?.id).toBe('A');
    expect(result?.name).toBe('앨리스');
  });

  it('세션이 비어있으면 undefined 반환', () => {
    const result = findMainPayer([], members);
    expect(result).toBeUndefined();
  });

  it('세션이 하나면 해당 결제자 반환', () => {
    const sessions: Session[] = [
      { id: 's1', title: '1차', totalAmount: 80000, payerId: 'B', participantIds: ['A', 'B'] },
    ];

    const result = findMainPayer(sessions, members);
    expect(result?.id).toBe('B');
    expect(result?.name).toBe('밥');
  });

  it('같은 금액이면 먼저 초과한 멤버 반환', () => {
    const sessions: Session[] = [
      { id: 's1', title: '1차', totalAmount: 50000, payerId: 'A', participantIds: ['A', 'B'] },
      { id: 's2', title: '2차', totalAmount: 50000, payerId: 'B', participantIds: ['A', 'B'] },
    ];

    // A가 먼저 50000에 도달, B는 같은 금액이지만 > 비교에서 초과하지 못해 A 유지
    const result = findMainPayer(sessions, members);
    expect(result?.id).toBe('A');
  });

  it('결제자 ID가 멤버 목록에 없으면 undefined 반환', () => {
    const sessions: Session[] = [
      { id: 's1', title: '1차', totalAmount: 50000, payerId: 'unknown', participantIds: ['A'] },
    ];

    const result = findMainPayer(sessions, members);
    expect(result).toBeUndefined();
  });
});
