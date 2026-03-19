import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareButton } from '../ui/ShareButton';

// Mock the kakao-share module
vi.mock('../lib/kakao-share', () => ({
  shareToKakao: vi.fn(),
  isKakaoAvailable: () => false,
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

  it('renders kakao speech bubble icon', () => {
    const { container } = render(<ShareButton {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '18');
  });
});
