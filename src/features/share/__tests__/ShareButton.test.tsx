import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShareButton } from '../ui/ShareButton';

const mockShareToKakao = vi.fn();
const mockIsKakaoAvailable = vi.fn(() => false);

// Mock the kakao-share module
vi.mock('../lib/kakao-share', () => ({
  shareToKakao: (...args: unknown[]) => mockShareToKakao(...args),
  isKakaoAvailable: () => mockIsKakaoAvailable(),
}));

// Mock the kakao-sdk module
vi.mock('@/shared/lib/kakao-sdk', () => ({
  loadKakaoSDK: vi.fn().mockResolvedValue(undefined),
}));

const defaultProps = {
  data: { members: [], sessions: [], settlement: [], transfers: [] },
  transfers: [],
  members: [],
  account: null,
  totalLabel: '0원',
};

describe('ShareButton', () => {
  it('renders kakao share button with icon', () => {
    const { container } = render(<ShareButton {...defaultProps} />);
    expect(screen.getByText('카카오톡으로 공유')).toBeInTheDocument();
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeInTheDocument();
  });

  it('renders kakao speech bubble icon with correct size', () => {
    const { container } = render(<ShareButton {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '18');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('카카오 미지원 시 에러 메시지 표시', async () => {
    const user = userEvent.setup();
    mockIsKakaoAvailable.mockReturnValue(false);
    render(<ShareButton {...defaultProps} />);

    await user.click(screen.getByText('카카오톡으로 공유'));

    await waitFor(() => {
      expect(screen.getByText(/카카오톡 공유를 사용할 수 없습니다/)).toBeInTheDocument();
    });
  });

  it('공유 실패 시 에러 메시지 표시', async () => {
    const user = userEvent.setup();
    mockIsKakaoAvailable.mockReturnValue(true);
    mockShareToKakao.mockRejectedValueOnce(new Error('fail'));
    render(<ShareButton {...defaultProps} />);

    await user.click(screen.getByText('카카오톡으로 공유'));

    await waitFor(() => {
      expect(screen.getByText('공유에 실패했습니다. 다시 시도해주세요.')).toBeInTheDocument();
    });
  });

  it('버튼 비활성화 시 opacity 스타일 적용', () => {
    render(<ShareButton {...defaultProps} />);
    const button = screen.getByText('카카오톡으로 공유').closest('button')!;
    expect(button.className).toContain('disabled:opacity-50');
  });
});
