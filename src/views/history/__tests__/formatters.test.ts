import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════
// HistoryPage 포맷터 함수 테스트
// formatDate, formatAmount는 모듈 내부 함수이므로 동일 로직을 재현하여 테스트
// ═══════════════════════════════════════════════════════

// Replicate the internal formatDate logic from HistoryPage.tsx:11-17
function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

// Replicate the internal formatAmount logic from HistoryPage.tsx:19-21
function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

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
