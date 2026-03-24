import { describe, it, expect, vi, beforeEach } from 'vitest';

// supabase 모듈 mock
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return { single: mockSingle };
          },
        };
      },
    })),
  },
}));

vi.mock('nanoid', () => ({
  nanoid: () => 'mock-id-10',
}));

vi.mock('../serializer', () => ({
  validateShareableData: (data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('invalid');
    }
    return data;
  },
}));

import { saveShare, getShare } from '../share-store';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('saveShare', () => {
  it('정상적으로 데이터를 저장하고 ID를 반환', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const data = { members: [], sessions: [], settlement: [] };
    const id = await saveShare(data);

    expect(id).toBe('mock-id-10');
    expect(mockInsert).toHaveBeenCalledWith({ id: 'mock-id-10', data });
  });

  it('외부에서 ID를 주입하면 nanoid 대신 사용', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const data = { members: [], sessions: [], settlement: [] };
    const id = await saveShare(data, 'custom-id');

    expect(id).toBe('custom-id');
    expect(mockInsert).toHaveBeenCalledWith({ id: 'custom-id', data });
  });

  it('첫 번째 실패 후 1회 재시도 성공', async () => {
    mockInsert
      .mockResolvedValueOnce({ error: { message: 'DB error' } })
      .mockResolvedValueOnce({ error: null });

    const data = { members: [], sessions: [], settlement: [] };
    const id = await saveShare(data);

    expect(id).toBe('mock-id-10');
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('2회 연속 실패 시 throw', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } });

    const data = { members: [], sessions: [], settlement: [] };
    await expect(saveShare(data)).rejects.toThrow(
      '정산 데이터 저장에 실패했습니다.',
    );
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });
});

describe('getShare', () => {
  it('정상적으로 데이터를 조회하면 ok: true 반환', async () => {
    const shareData = { members: [], sessions: [], settlement: [] };
    mockSingle.mockResolvedValue({ data: { data: shareData }, error: null });

    const result = await getShare('test-id');

    expect(result).toEqual({ ok: true, data: shareData });
    expect(mockSelect).toHaveBeenCalledWith('data');
    expect(mockEq).toHaveBeenCalledWith('id', 'test-id');
  });

  it('PGRST116 에러 시 not_found 반환', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } });

    const result = await getShare('test-id');

    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('PGRST116 이외의 Supabase 에러 시 network 반환', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST000', message: 'error' } });

    const result = await getShare('test-id');

    expect(result).toEqual({ ok: false, reason: 'network' });
  });

  it('데이터가 없으면 not_found 반환', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const result = await getShare('test-id');

    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('데이터 검증 실패 시 corrupted 반환', async () => {
    mockSingle.mockResolvedValue({ data: { data: null }, error: null });

    const result = await getShare('test-id');

    expect(result).toEqual({ ok: false, reason: 'corrupted' });
  });
});

describe('saveShare - 크기 제한', () => {
  it('100KB 초과 데이터 저장 시 에러', async () => {
    // 100KB를 초과하는 큰 데이터 생성
    const largeData = {
      members: [],
      sessions: Array.from({ length: 5000 }, (_, i) => ({
        id: `session-${i}`,
        title: 'A'.repeat(100),
        totalAmount: 10000,
        payerId: 'payer',
        participantIds: ['a', 'b', 'c'],
      })),
      settlement: [],
    };

    await expect(saveShare(largeData)).rejects.toThrow(
      '정산 데이터가 너무 큽니다. 세션 수를 줄여주세요.',
    );
    // INSERT가 호출되지 않아야 함
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('100KB 이하 데이터는 정상 저장', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const smallData = { members: [], sessions: [], settlement: [] };
    const id = await saveShare(smallData);

    expect(id).toBe('mock-id-10');
    expect(mockInsert).toHaveBeenCalled();
  });
});

describe('getShare - ID 형식 검증', () => {
  it('빈 문자열 ID는 not_found 반환', async () => {
    const result = await getShare('');
    expect(result).toEqual({ ok: false, reason: 'not_found' });
    // Supabase가 호출되지 않아야 함
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('21자 초과 ID는 not_found 반환', async () => {
    const longId = 'a'.repeat(22);
    const result = await getShare(longId);
    expect(result).toEqual({ ok: false, reason: 'not_found' });
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('21자 이하 유효한 ID는 정상 조회', async () => {
    const shareData = { members: [], sessions: [], settlement: [] };
    mockSingle.mockResolvedValue({ data: { data: shareData }, error: null });

    const result = await getShare('valid-id');
    expect(result).toEqual({ ok: true, data: shareData });
  });
});

describe('getShare - supabase가 null인 경우', () => {
  it('supabase가 null이면 network 에러 반환', async () => {
    // 이 케이스는 supabase 모듈이 null을 반환하는 상황을 테스트
    // 현재 mock에서는 항상 supabase가 존재하므로 별도 모듈 리셋 필요
    vi.doMock('../supabase', () => ({ supabase: null }));
    vi.resetModules();

    const { getShare: getShareNull } = await import('../share-store');
    const result = await getShareNull('test-id');
    expect(result).toEqual({ ok: false, reason: 'network' });
  });
});

describe('saveShare - supabase가 null인 경우', () => {
  it('supabase가 null이면 throw', async () => {
    vi.doMock('../supabase', () => ({ supabase: null }));
    vi.resetModules();

    const { saveShare: saveShareNull } = await import('../share-store');
    const data = { members: [], sessions: [], settlement: [] };
    await expect(saveShareNull(data)).rejects.toThrow(
      '공유 기능이 비활성화되어 있습니다.',
    );
  });
});
