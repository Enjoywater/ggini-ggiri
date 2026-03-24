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
    const dots = container.querySelectorAll('[aria-hidden="true"].rounded-full');
    expect(dots.length).toBe(2);
    const firstDot = dots[0] as HTMLElement;
    const secondDot = dots[1] as HTMLElement;
    expect(firstDot.getAttribute('style')).toBeTruthy();
    expect(secondDot.getAttribute('style')).toBeTruthy();
    expect(firstDot.getAttribute('style')).not.toBe(secondDot.getAttribute('style'));
  });

  it('색상 도트에 올바른 크기 클래스 적용', () => {
    const { container } = render(
      <SettlementResult results={mockResults} payerName="결제자" members={mockMembers} />
    );
    const dots = container.querySelectorAll('[aria-hidden="true"].rounded-full');
    for (const dot of dots) {
      expect(dot.className).toContain('h-3');
      expect(dot.className).toContain('w-3');
    }
  });

  it('멤버별 도트 색상이 PASTEL_COLORS 순서와 일치', () => {
    const { container } = render(
      <SettlementResult results={mockResults} payerName="결제자" members={mockMembers} />
    );
    const dots = container.querySelectorAll('[aria-hidden="true"].rounded-full');
    // m1=홍길동 → index 0 → pink, m2=김철수 → index 1 → lavender
    const firstStyle = (dots[0] as HTMLElement).getAttribute('style') ?? '';
    const secondStyle = (dots[1] as HTMLElement).getAttribute('style') ?? '';
    expect(firstStyle).toContain('--pastel-pink-dark');
    expect(secondStyle).toContain('--pastel-lavender-dark');
  });

  it('결과 없을 때 빈 상태 메시지 표시', () => {
    render(<SettlementResult results={[]} payerName="결제자" />);
    expect(screen.getByText('정산할 내역이 없습니다')).toBeInTheDocument();
  });
});

describe('SettlementResult - 양방향 표시', () => {
  const resultsWithReceiver = [
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
      totalAmount: -15000,
      details: [
        { sessionId: 's1', sessionTitle: '1차', baseAmount: 15000, alcoholAmount: 0, subtotal: 15000 },
      ],
    },
  ];

  it('보내야 할 금액 섹션 표시', () => {
    render(<SettlementResult results={resultsWithReceiver} payerName="김철수" />);
    expect(screen.getByText('보내야 할 금액')).toBeInTheDocument();
  });

  it('받을 금액 섹션 표시', () => {
    render(<SettlementResult results={resultsWithReceiver} payerName="김철수" />);
    expect(screen.getByText('받을 금액')).toBeInTheDocument();
  });

  it('받을 사람 금액은 절댓값으로 표시', () => {
    render(<SettlementResult results={resultsWithReceiver} payerName="김철수" />);
    // 김철수는 -15000이지만 절대값 15,000으로 표시되어야 함
    expect(screen.getByText('김철수')).toBeInTheDocument();
  });

  it('양쪽 모두 없으면 빈 상태 메시지', () => {
    render(<SettlementResult results={[{ memberId: 'm1', memberName: 'A', totalAmount: 0, details: [] }]} payerName="결제자" />);
    expect(screen.getByText('정산할 내역이 없습니다')).toBeInTheDocument();
  });
});
