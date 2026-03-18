import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareButton } from '../ShareButton';
import type { Member } from '@/shared/types';
import type { Transfer } from '@/features/calculate';
import type { ShareableData } from '@/shared/lib/serializer';

const mockShareToKakao = vi.fn();
const mockIsKakaoAvailable = vi.fn();

vi.mock('../../lib/kakao-share', () => ({
  shareToKakao: (...args: unknown[]) => mockShareToKakao(...args),
  isKakaoAvailable: () => mockIsKakaoAvailable(),
}));

const members: Member[] = [
  { id: 'A', name: '앨리스' },
  { id: 'B', name: '밥' },
];

const transfers: Transfer[] = [
  { from: 'B', to: 'A', amount: 50000 },
];

const data: ShareableData = {
  members,
  sessions: [],
  settlement: [],
};

const defaultProps = {
  data,
  transfers,
  members,
  account: null,
  totalLabel: '100,000원',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsKakaoAvailable.mockResolvedValue(true);
  mockShareToKakao.mockResolvedValue(undefined);
});

describe('ShareButton', () => {
  it('기본 버튼 텍스트 렌더링', () => {
    render(<ShareButton {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: '카카오톡으로 공유' }),
    ).toBeInTheDocument();
  });

  it('공유 중 버튼 텍스트 변경 및 disabled', async () => {
    const user = userEvent.setup();

    // shareToKakao를 지연시켜서 loading 상태 확인
    let resolveShare: () => void;
    mockShareToKakao.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveShare = resolve;
      }),
    );

    render(<ShareButton {...defaultProps} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(button).toHaveTextContent('공유 중...');
    expect(button).toBeDisabled();

    resolveShare!();
    await waitFor(() => {
      expect(button).toHaveTextContent('카카오톡으로 공유');
      expect(button).not.toBeDisabled();
    });
  });

  it('카카오톡 사용 불가 시 에러 메시지 표시', async () => {
    const user = userEvent.setup();
    mockIsKakaoAvailable.mockResolvedValue(false);

    render(<ShareButton {...defaultProps} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(
        screen.getByText(
          '카카오톡 공유를 사용할 수 없습니다. 텍스트 공유를 이용해주세요.',
        ),
      ).toBeInTheDocument();
    });

    // shareToKakao는 호출되지 않아야 함
    expect(mockShareToKakao).not.toHaveBeenCalled();
  });

  it('공유 실패 시 에러 메시지 표시', async () => {
    const user = userEvent.setup();
    mockShareToKakao.mockRejectedValue(new Error('공유 실패'));

    render(<ShareButton {...defaultProps} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(
        screen.getByText('공유에 실패했습니다. 다시 시도해주세요.'),
      ).toBeInTheDocument();
    });
  });

  it('성공적인 공유 시 shareToKakao에 올바른 인자 전달', async () => {
    const user = userEvent.setup();
    const account = {
      bankName: '카카오뱅크',
      accountNumber: '3333-01-1234567',
      ownerName: '앨리스',
    };

    render(<ShareButton {...defaultProps} account={account} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockShareToKakao).toHaveBeenCalledWith({
        data,
        transfers,
        members,
        account,
        totalLabel: '100,000원',
      });
    });
  });
});
