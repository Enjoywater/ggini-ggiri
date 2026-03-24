import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('nanoid', () => ({
  nanoid: () => 'mock-share-id',
}));

vi.mock('@/shared/lib/kakao-sdk', () => ({
  loadKakaoSDK: vi.fn().mockResolvedValue(undefined),
  isKakaoSDKReady: vi.fn().mockReturnValue(true),
}));

vi.mock('@/shared/lib/share-store', () => ({
  saveShare: vi.fn().mockResolvedValue('mock-share-id'),
}));

import { shareToKakao, isKakaoAvailable } from '../kakao-share';
import { loadKakaoSDK, isKakaoSDKReady } from '@/shared/lib/kakao-sdk';
import { saveShare } from '@/shared/lib/share-store';
import type { Member, Transfer } from '@/shared/types';
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
  it('SDK 준비 완료 시 loadKakaoSDK를 호출하지 않고 즉시 sendDefault 호출', async () => {
    await shareToKakao({
      data,
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
    });

    expect(isKakaoSDKReady).toHaveBeenCalled();
    expect(loadKakaoSDK).not.toHaveBeenCalled();
    expect(mockSendDefault).toHaveBeenCalledOnce();

    const arg = mockSendDefault.mock.calls[0][0];
    expect(arg.objectType).toBe('feed');
    expect(arg.content.title).toContain('100,000원');
    expect(arg.content.description).toContain('밥 → 앨리스 : 50,000원');
    expect(arg.content.link.webUrl).toContain('mock-share-id');
  });

  it('SDK 미준비 시 fallback으로 loadKakaoSDK 호출', async () => {
    vi.mocked(isKakaoSDKReady).mockReturnValueOnce(false);

    await shareToKakao({
      data,
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
    });

    expect(loadKakaoSDK).toHaveBeenCalled();
    expect(mockSendDefault).toHaveBeenCalledOnce();
  });

  it('sendDefault가 saveShare 완료 전에 호출됨', async () => {
    const callOrder: string[] = [];
    mockSendDefault.mockImplementation(() => { callOrder.push('sendDefault'); });
    vi.mocked(saveShare).mockImplementation(async () => {
      callOrder.push('saveShare');
      return 'mock-share-id';
    });

    await shareToKakao({
      data,
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
    });

    expect(callOrder[0]).toBe('sendDefault');
  });

  it('saveShare에 생성된 ID를 전달', async () => {
    await shareToKakao({
      data,
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
    });

    expect(saveShare).toHaveBeenCalledWith(data, 'mock-share-id');
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
    vi.mocked(isKakaoSDKReady).mockReturnValueOnce(false);
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

  it('saveShare 실패해도 sendDefault는 이미 호출됨 (에러 전파 안 됨)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(saveShare).mockRejectedValueOnce(new Error('저장 실패'));

    // shareToKakao 자체는 reject하지 않음
    await shareToKakao({
      data,
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
    });

    expect(mockSendDefault).toHaveBeenCalledOnce();

    // 비동기 에러 로그 확인을 위해 마이크로태스크 대기
    await new Promise((r) => setTimeout(r, 0));
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ggini-ggiri] 정산 데이터 저장 실패:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});

describe('isKakaoAvailable', () => {
  it('환경변수가 설정되어 있으면 true', () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-key');

    const result = isKakaoAvailable();
    expect(result).toBe(true);

    vi.unstubAllEnvs();
  });

  it('환경변수가 없으면 false', () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', '');

    const result = isKakaoAvailable();
    expect(result).toBe(false);

    vi.unstubAllEnvs();
  });
});
