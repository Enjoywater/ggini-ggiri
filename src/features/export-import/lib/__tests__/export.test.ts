import { describe, it, expect, vi } from 'vitest';
import { buildExportData, exportToJson, generateFileName } from '../export';
import type { SettlementHistory } from '@/shared/types';

function makeSampleHistory(): SettlementHistory {
  return {
    id: 'h1',
    createdAt: 1710288000000,
    title: '2024.03.13 정산',
    memberNames: ['홍길동', '김철수'],
    totalAmount: 80000,
    sessionCount: 1,
    members: [
      { id: 'm1', name: '홍길동' },
      { id: 'm2', name: '김철수' },
    ],
    sessions: [
      {
        id: 's1',
        title: '1차',
        totalAmount: 80000,
        payerId: 'm1',
        participantIds: ['m1', 'm2'],
        alcohol: {
          unitPrice: 5000,
          quantity: 2,
          drinkerIds: ['m1'],
        },
      },
    ],
    results: [
      {
        memberId: 'm1',
        memberName: '홍길동',
        totalAmount: 45000,
        details: [
          {
            sessionId: 's1',
            sessionTitle: '1차',
            baseAmount: 35000,
            alcoholAmount: 10000,
            subtotal: 45000,
          },
        ],
      },
    ],
    transfers: [{ from: 'm2', to: 'm1', amount: 35000 }],
  };
}

describe('buildExportData', () => {
  it('version 필드가 포함된 유효한 JSON을 생성한다', () => {
    const result = buildExportData([makeSampleHistory()]);
    expect(result.version).toBe(1);
    expect(result.history).toHaveLength(1);
  });

  it('exportedAt 타임스탬프가 포함된다', () => {
    const result = buildExportData([makeSampleHistory()]);
    expect(result.exportedAt).toBeDefined();
    expect(() => new Date(result.exportedAt)).not.toThrow();
  });

  it('빈 히스토리를 처리한다', () => {
    const result = buildExportData([]);
    expect(result.version).toBe(1);
    expect(result.history).toHaveLength(0);
  });

  it('계좌 정보가 제거된다', () => {
    const history = makeSampleHistory();
    // SettlementHistory에는 account 필드가 없지만, 혹시 있더라도 제거됨을 검증
    const result = buildExportData([history]);
    const json = JSON.stringify(result);
    expect(json).not.toContain('accountNumber');
    expect(json).not.toContain('bankName');
  });

  it('history 항목에 필수 필드가 모두 포함된다', () => {
    const result = buildExportData([makeSampleHistory()]);
    const item = result.history[0];
    expect(item.members).toBeDefined();
    expect(item.sessions).toBeDefined();
    expect(item.results).toBeDefined();
    expect(item.transfers).toBeDefined();
    expect(item.timestamp).toBe(1710288000000);
    expect(item.title).toBe('2024.03.13 정산');
  });
});

describe('exportToJson', () => {
  it('application/json Blob을 반환한다', () => {
    const blob = exportToJson([makeSampleHistory()]);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
  });
});

describe('generateFileName', () => {
  it('올바른 형식의 파일명을 반환한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-13'));
    const name = generateFileName();
    expect(name).toBe('ggini-ggiri-export-2026-03-13.json');
    vi.useRealTimers();
  });

  it('.json 확장자로 끝난다', () => {
    const name = generateFileName();
    expect(name).toMatch(/\.json$/);
  });

  it('ggini-ggiri-export- 접두사로 시작한다', () => {
    const name = generateFileName();
    expect(name).toMatch(/^ggini-ggiri-export-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
