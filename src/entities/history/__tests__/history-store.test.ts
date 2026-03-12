import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '../model/store';
import type { Member, Session, SettlementResult } from '@/shared/types';

// ═══════════════════════════════════════════════════════
// 정산 히스토리 스토어 테스트
// ═══════════════════════════════════════════════════════

const mockMembers: Member[] = [
  { id: 'a1', name: '앨리스' },
  { id: 'b1', name: '밥' },
];

const mockSessions: Session[] = [
  {
    id: 's1',
    title: '1차 고기집',
    totalAmount: 100000,
    payerId: 'a1',
    participantIds: ['a1', 'b1'],
  },
];

const mockResults: SettlementResult[] = [
  {
    memberId: 'b1',
    memberName: '밥',
    totalAmount: 50000,
    details: [
      {
        sessionId: 's1',
        sessionTitle: '1차 고기집',
        baseAmount: 50000,
        alcoholAmount: 0,
        subtotal: 50000,
      },
    ],
  },
];

const mockTransfers = [{ from: 'b1', to: 'a1', amount: 50000 }];

function createMockHistoryParams() {
  return {
    title: '2024.03.12 정산',
    memberNames: ['앨리스', '밥'],
    totalAmount: 100000,
    sessionCount: 1,
    members: [...mockMembers],
    sessions: [...mockSessions],
    results: [...mockResults],
    transfers: [...mockTransfers],
  };
}

beforeEach(() => {
  useHistoryStore.getState().clearAll();
});

describe('HistoryStore - addHistory', () => {
  it('고유 ID와 createdAt이 자동 생성됨', () => {
    const history = useHistoryStore.getState().addHistory(createMockHistoryParams());
    expect(history.id).toBeDefined();
    expect(history.id.length).toBe(12);
    expect(history.createdAt).toBeGreaterThan(0);
    expect(typeof history.createdAt).toBe('number');
  });

  it('히스토리가 배열 맨 앞에 추가됨 (최신순)', () => {
    const first = useHistoryStore.getState().addHistory(createMockHistoryParams());
    const second = useHistoryStore.getState().addHistory({
      ...createMockHistoryParams(),
      title: '두 번째 정산',
    });

    const { histories } = useHistoryStore.getState();
    expect(histories.length).toBe(2);
    expect(histories[0].id).toBe(second.id);
    expect(histories[1].id).toBe(first.id);
  });

  it('서로 다른 ID가 생성됨', () => {
    const first = useHistoryStore.getState().addHistory(createMockHistoryParams());
    const second = useHistoryStore.getState().addHistory(createMockHistoryParams());
    expect(first.id).not.toBe(second.id);
  });
});

describe('HistoryStore - removeHistory', () => {
  it('ID로 히스토리 삭제', () => {
    const history = useHistoryStore.getState().addHistory(createMockHistoryParams());
    expect(useHistoryStore.getState().histories.length).toBe(1);

    useHistoryStore.getState().removeHistory(history.id);
    expect(useHistoryStore.getState().histories.length).toBe(0);
  });

  it('존재하지 않는 ID 삭제 시 아무 변화 없음', () => {
    useHistoryStore.getState().addHistory(createMockHistoryParams());
    useHistoryStore.getState().removeHistory('nonexistent');
    expect(useHistoryStore.getState().histories.length).toBe(1);
  });
});

describe('HistoryStore - getHistory', () => {
  it('ID로 히스토리 조회', () => {
    const history = useHistoryStore.getState().addHistory(createMockHistoryParams());
    const found = useHistoryStore.getState().getHistory(history.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(history.id);
    expect(found!.title).toBe('2024.03.12 정산');
  });

  it('존재하지 않는 ID 조회 시 undefined', () => {
    const found = useHistoryStore.getState().getHistory('nonexistent');
    expect(found).toBeUndefined();
  });
});

describe('HistoryStore - clearAll', () => {
  it('모든 히스토리 삭제', () => {
    useHistoryStore.getState().addHistory(createMockHistoryParams());
    useHistoryStore.getState().addHistory(createMockHistoryParams());
    useHistoryStore.getState().addHistory(createMockHistoryParams());
    expect(useHistoryStore.getState().histories.length).toBe(3);

    useHistoryStore.getState().clearAll();
    expect(useHistoryStore.getState().histories.length).toBe(0);
  });

  it('빈 상태에서 clearAll 호출 시 오류 없음', () => {
    useHistoryStore.getState().clearAll();
    expect(useHistoryStore.getState().histories.length).toBe(0);
  });
});

describe('HistoryStore - FIFO 제한 (max 50)', () => {
  it('51번째 항목 추가 시 가장 오래된 항목 제거', () => {
    // 50개 추가
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      const h = useHistoryStore.getState().addHistory({
        ...createMockHistoryParams(),
        title: `정산 ${i}`,
      });
      ids.push(h.id);
    }
    expect(useHistoryStore.getState().histories.length).toBe(50);

    // 51번째 추가 → 가장 오래된 (첫 번째 추가된) 항목 제거
    const newest = useHistoryStore.getState().addHistory({
      ...createMockHistoryParams(),
      title: '정산 50',
    });

    const { histories } = useHistoryStore.getState();
    expect(histories.length).toBe(50);
    expect(histories[0].id).toBe(newest.id);
    // 가장 오래된 항목 (인덱스 0으로 추가된 것 = 배열 끝에 있던 것)이 삭제됨
    expect(useHistoryStore.getState().getHistory(ids[0])).toBeUndefined();
  });
});

describe('HistoryStore - 데이터 무결성', () => {
  it('모든 필드가 올바르게 보존됨', () => {
    const params = createMockHistoryParams();
    const history = useHistoryStore.getState().addHistory(params);
    const found = useHistoryStore.getState().getHistory(history.id)!;

    expect(found.title).toBe(params.title);
    expect(found.memberNames).toEqual(params.memberNames);
    expect(found.totalAmount).toBe(params.totalAmount);
    expect(found.sessionCount).toBe(params.sessionCount);
    expect(found.members).toEqual(params.members);
    expect(found.sessions).toEqual(params.sessions);
    expect(found.results).toEqual(params.results);
    expect(found.transfers).toEqual(params.transfers);
  });

  it('members 배열이 스냅샷으로 저장됨 (참조 독립)', () => {
    const params = createMockHistoryParams();
    const history = useHistoryStore.getState().addHistory(params);

    // 원본 수정해도 저장된 데이터에 영향 없음
    params.members.push({ id: 'c1', name: '찰리' });

    const found = useHistoryStore.getState().getHistory(history.id)!;
    expect(found.members.length).toBe(2); // 원래 2명
  });

  it('transfers 배열 구조가 올바름', () => {
    const history = useHistoryStore.getState().addHistory(createMockHistoryParams());
    const found = useHistoryStore.getState().getHistory(history.id)!;

    expect(found.transfers.length).toBe(1);
    expect(found.transfers[0]).toEqual({
      from: 'b1',
      to: 'a1',
      amount: 50000,
    });
  });
});
