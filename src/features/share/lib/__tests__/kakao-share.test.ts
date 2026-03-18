import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/kakao-sdk', () => ({
  loadKakaoSDK: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/lib/share-store', () => ({
  saveShare: vi.fn().mockResolvedValue('share-id-123'),
}));

import { shareToKakao, isKakaoAvailable } from '../kakao-share';
import { loadKakaoSDK } from '@/shared/lib/kakao-sdk';
import { saveShare } from '@/shared/lib/share-store';
import type { Member } from '@/shared/types';
import type { Transfer } from '@/features/calculate';
import type { ShareableData } from '@/shared/lib/serializer';

const mockSendDefault = vi.fn();

const members: Member[] = [
  { id: 'A', name: '앨리스' },
  { id: 'B', name: '밥' },
];

const transfers: Transfer[] = [
  { from: 'B', to: 'A', amount: 50000 },
];

const data: ShareableData = {
  members,
  sessions: [
    {
      id: 's1',
      title: '1차',
      totalAmount: 100000,
      payerId: 'A',
      participantIds: ['A', 'B'],
    },
  ],
  settlement: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as Record<string, unknown>).Kakao = {
    Share: { sendDefault: mockSendDefault },
  };
});

describe('shareToKakao', () => {
  it('SDK 로드 + 데이터 저장 후 Kakao.Share.sendDefault 호출', async () => {
    await shareToKakao({
      data,
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
    });

    expect(loadKakaoSDK).toHaveBeenCalled();
    expect(saveShare).toHaveBeenCalledWith(data);
    expect(mockSendDefault).toHaveBeenCalledOnce();

    const arg = mockSendDefault.mock.calls[0][0];
    expect(arg.objectType).toBe('feed');
    expect(arg.content.title).toContain('100,000원');
    expect(arg.content.description).toContain('밥 → 앨리스 : 50,000원');
    expect(arg.content.link.webUrl).toContain('share-id-123');
  });

  it('계좌 정보가 있으면 description에 포함', async () => {
    await shareToKakao({
      data,
      transfers,
      members,
      account: {
        bankName: '카카오뱅크',
        accountNumber: '3333-01-1234567',
        ownerName: '앨리스',
      },
      totalLabel: '100,000원',
    });

    const desc: string = mockSendDefault.mock.calls[0][0].content.description;
    expect(desc).toContain('[입금계좌] 카카오뱅크 3333-01-1234567');
    expect(desc).toContain('예금주: 앨리스');
  });

  it('계좌 정보가 없으면 입금계좌 섹션 없음', async () => {
    await shareToKakao({
      data,
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
    });

    const desc: string = mockSendDefault.mock.calls[0][0].content.description;
    expect(desc).not.toContain('[입금계좌]');
  });

  it('멤버 ID가 매핑되지 않으면 ?로 표시', async () => {
    const unknownTransfers: Transfer[] = [
      { from: 'unknown-id', to: 'A', amount: 30000 },
    ];

    await shareToKakao({
      data,
      transfers: unknownTransfers,
      members,
      account: null,
      totalLabel: '30,000원',
    });

    const desc: string = mockSendDefault.mock.calls[0][0].content.description;
    expect(desc).toContain('? → 앨리스');
  });

  it('SDK 로드 실패 시 에러 전파', async () => {
    vi.mocked(loadKakaoSDK).mockRejectedValueOnce(new Error('SDK 로드 실패'));

    await expect(
      shareToKakao({
        data,
        transfers,
        members,
        account: null,
        totalLabel: '100,000원',
      }),
    ).rejects.toThrow('SDK 로드 실패');
  });

  it('데이터 저장 실패 시 에러 전파', async () => {
    vi.mocked(saveShare).mockRejectedValueOnce(new Error('저장 실패'));

    await expect(
      shareToKakao({
        data,
        transfers,
        members,
        account: null,
        totalLabel: '100,000원',
      }),
    ).rejects.toThrow('저장 실패');
  });
});

describe('isKakaoAvailable', () => {
  it('환경변수가 설정되어 있으면 true', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-key');

    const result = await isKakaoAvailable();
    expect(result).toBe(true);

    vi.unstubAllEnvs();
  });

  it('환경변수가 없으면 false', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', '');

    const result = await isKakaoAvailable();
    expect(result).toBe(false);

    vi.unstubAllEnvs();
  });
});
