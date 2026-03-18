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

  it('Supabase 에러 시 throw', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } });

    const data = { members: [], sessions: [], settlement: [] };
    await expect(saveShare(data)).rejects.toThrow(
      '정산 데이터 저장에 실패했습니다.',
    );
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

  it('Supabase 에러 시 network 반환', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'error' } });

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
