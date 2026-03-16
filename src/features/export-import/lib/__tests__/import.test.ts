import { describe, it, expect, vi } from 'vitest';
import { parseImportFile, extractHistory } from '../import';
import type { ExportData } from '../export';

// vi.mock은 Vitest에 의해 파일 최상위로 호이스팅되므로 명시적으로 최상위에 선언
vi.mock('@/shared/lib/nanoid', () => ({
  createId: () => 'mock-id-000000',
}));

function makeValidExportJson(): string {
  return JSON.stringify({
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
        transfers: [],
        timestamp: 1710288000000,
        title: '2024.03.13 정산',
      },
    ],
  });
}

function createMockFile(content: string, name = 'test.json', type = 'application/json'): File {
  return new File([content], name, { type });
}

describe('parseImportFile', () => {
  it('유효한 JSON 파일을 파싱한다', async () => {
    const file = createMockFile(makeValidExportJson());
    const result = await parseImportFile(file);
    expect(result.version).toBe(1);
    expect(result.history).toHaveLength(1);
  });

  it('JSON이 아닌 콘텐츠를 거부한다', async () => {
    const file = createMockFile('이것은 JSON이 아닙니다!!!');
    await expect(parseImportFile(file)).rejects.toThrow('유효하지 않은 JSON');
  });

  it('5MB를 초과하는 파일을 거부한다', async () => {
    const bigContent = 'x'.repeat(6 * 1024 * 1024);
    const file = createMockFile(bigContent);
    await expect(parseImportFile(file)).rejects.toThrow('5MB');
  });

  it('유효하지 않은 스키마를 거부한다', async () => {
    const file = createMockFile(JSON.stringify({ foo: 'bar' }));
    await expect(parseImportFile(file)).rejects.toThrow('데이터 검증 실패');
  });

  it('계좌 정보가 포함된 데이터를 거부한다', async () => {
    const data = JSON.parse(makeValidExportJson());
    data.accountNumber = '1234567890';
    const file = createMockFile(JSON.stringify(data));
    await expect(parseImportFile(file)).rejects.toThrow('데이터 검증 실패');
  });
});

describe('extractHistory', () => {
  it('올바른 SettlementHistory 배열을 반환한다', () => {
    const exportData: ExportData = {
      version: 1,
      exportedAt: '2026-03-13T00:00:00.000Z',
      history: [
        {
          members: [
            { id: 'm1', name: '홍길동' },
            { id: 'm2', name: '김철수' },
          ],
          sessions: [
            {
              id: 's1',
              title: '1차',
              totalAmount: 50000,
              payerId: 'm1',
              participantIds: ['m1', 'm2'],
            },
          ],
          results: [
            {
              memberId: 'm1',
              memberName: '홍길동',
              totalAmount: 25000,
              details: [],
            },
          ],
          transfers: [{ from: 'm2', to: 'm1', amount: 25000 }],
          timestamp: 1710288000000,
          title: '2024.03.13 정산',
        },
      ],
    };

    const histories = extractHistory(exportData);
    expect(histories).toHaveLength(1);
    expect(histories[0].title).toBe('2024.03.13 정산');
    expect(histories[0].createdAt).toBe(1710288000000);
    expect(histories[0].memberNames).toEqual(['홍길동', '김철수']);
    expect(histories[0].totalAmount).toBe(50000);
    expect(histories[0].sessionCount).toBe(1);
    expect(histories[0].members).toHaveLength(2);
    expect(histories[0].sessions).toHaveLength(1);
    expect(histories[0].results).toHaveLength(1);
    expect(histories[0].transfers).toHaveLength(1);
  });

  it('빈 history에서는 빈 배열을 반환한다', () => {
    const exportData: ExportData = {
      version: 1,
      exportedAt: '2026-03-13T00:00:00.000Z',
      history: [],
    };
    const histories = extractHistory(exportData);
    expect(histories).toHaveLength(0);
  });
});
