import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettlementResult } from '../SettlementResult';

// Mock zustand stores
vi.mock('@/entities/account', () => ({
  useAccountStore: () => null,
}));

vi.mock('@/shared/lib/use-toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const mockResults = [
  {
    memberId: 'm1',
    memberName: '홍길동',
    totalAmount: 15000,
    details: [
      { sessionId: 's1', sessionTitle: '1차', baseAmount: 15000, alcoholAmount: 0, subtotal: 15000 },
    ],
  },
  {
    memberId: 'm2',
    memberName: '김철수',
    totalAmount: 20000,
    details: [
      { sessionId: 's1', sessionTitle: '1차', baseAmount: 20000, alcoholAmount: 0, subtotal: 20000 },
    ],
  },
];

const mockMembers = [
  { id: 'm1', name: '홍길동' },
  { id: 'm2', name: '김철수' },
];

describe('SettlementResult', () => {
  it('renders member names and amounts', () => {
    render(<SettlementResult results={mockResults} payerName="결제자" />);
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
  });

  it('renders color dots when members prop is provided', () => {
    const { container } = render(
      <SettlementResult results={mockResults} payerName="결제자" members={mockMembers} />
    );
    const dots = container.querySelectorAll('[aria-hidden="true"].rounded-full');
    expect(dots.length).toBe(2);
  });

  it('does not render color dots when members prop is not provided', () => {
    const { container } = render(
      <SettlementResult results={mockResults} payerName="결제자" />
    );
    const dots = container.querySelectorAll('[aria-hidden="true"].rounded-full');
    expect(dots.length).toBe(0);
  });

  it('applies tint background via tintMap when members are provided', () => {
    const { container } = render(
      <SettlementResult results={mockResults} payerName="결제자" members={mockMembers} />
    );
    // When members are provided, each result card's color dot should have a background-color style
    const dots = container.querySelectorAll('[aria-hidden="true"].rounded-full');
    expect(dots.length).toBe(2);
    // First member gets 'pink' color, second gets 'lavender'
    const firstDot = dots[0] as HTMLElement;
    const secondDot = dots[1] as HTMLElement;
    // jsdom may not parse CSS custom properties, but the style attribute should be set
    expect(firstDot.getAttribute('style')).toBeTruthy();
    expect(secondDot.getAttribute('style')).toBeTruthy();
    // Verify different dots have different styles (different colors assigned)
    expect(firstDot.getAttribute('style')).not.toBe(secondDot.getAttribute('style'));
  });
});
