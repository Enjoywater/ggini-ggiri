import { describe, it, expect } from 'vitest';
import { validateExportData } from '../validate';

function makeValidData() {
  return {
    version: 1,
    exportedAt: '2026-03-13T00:00:00.000Z',
    history: [
      {
        members: [{ id: 'm1', name: '홍길동' }],
        sessions: [
          {
            id: 's1',
            title: '1차',
            totalAmount: 50000,
            payerId: 'm1',
            participantIds: ['m1'],
          },
        ],
        results: [
          {
            memberId: 'm1',
            memberName: '홍길동',
            totalAmount: 50000,
            details: [],
          },
        ],
        transfers: [{ from: 'm1', to: 'm2', amount: 25000 }],
        timestamp: 1710288000000,
        title: '2024.03.13 정산',
      },
    ],
  };
}

describe('validateExportData', () => {
  it('유효한 데이터는 검증을 통과한다', () => {
    const result = validateExportData(makeValidData());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('version 필드가 없으면 실패한다', () => {
    const data = makeValidData();
    delete (data as Record<string, unknown>).version;
    const result = validateExportData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('version'))).toBe(true);
  });

  it('history 필드가 없으면 실패한다', () => {
    const data = makeValidData();
    delete (data as Record<string, unknown>).history;
    const result = validateExportData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('history'))).toBe(true);
  });

  it('history 항목에 필수 필드가 누락되면 실패한다', () => {
    const data = makeValidData();
    delete (data.history[0] as Record<string, unknown>).members;
    delete (data.history[0] as Record<string, unknown>).transfers;
    const result = validateExportData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('members'))).toBe(true);
    expect(result.errors.some((e) => e.includes('transfers'))).toBe(true);
  });

  it('계좌 정보가 포함되면 거부한다', () => {
    const data = makeValidData();
    (data as Record<string, unknown>).accountNumber = '1234567890';
    const result = validateExportData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('accountNumber'))).toBe(true);
  });

  it('bankName이 포함되면 거부한다', () => {
    const data = makeValidData();
    (data as Record<string, unknown>).bankName = '국민은행';
    const result = validateExportData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('bankName'))).toBe(true);
  });

  it('ownerName이 포함되면 거부한다', () => {
    const data = makeValidData();
    (data as Record<string, unknown>).ownerName = '홍길동';
    const result = validateExportData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('ownerName'))).toBe(true);
  });

  it('타입이 맞지 않으면 실패한다 (string이 와야 할 곳에 number)', () => {
    const data = makeValidData();
    (data.history[0] as Record<string, unknown>).title = 12345;
    const result = validateExportData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('title'))).toBe(true);
  });

  it('빈 history 배열은 유효하다', () => {
    const data = makeValidData();
    data.history = [];
    const result = validateExportData(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('history가 배열이 아니면 실패한다', () => {
    const data = makeValidData();
    (data as Record<string, unknown>).history = 'not-array';
    const result = validateExportData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('배열'))).toBe(true);
  });

  it('null 데이터는 실패한다', () => {
    const result = validateExportData(null);
    expect(result.valid).toBe(false);
  });
});
