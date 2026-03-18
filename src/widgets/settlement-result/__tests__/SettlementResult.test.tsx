import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettlementResult } from '../SettlementResult';
import { useAccountStore } from '@/entities/account';
import type { SettlementResult as SettlementResultType } from '@/shared/types';

vi.mock('@/shared/lib/use-hydration', () => ({
  useHydration: () => true,
}));

const mockResults: SettlementResultType[] = [
  {
    memberId: 'B',
    memberName: '밥',
    totalAmount: 50000,
    details: [
      {
        sessionId: 's1',
        sessionTitle: '1차 삼겹살',
        baseAmount: 40000,
        alcoholAmount: 10000,
        subtotal: 50000,
      },
    ],
  },
  {
    memberId: 'C',
    memberName: '찰리',
    totalAmount: 30000,
    details: [
      {
        sessionId: 's1',
        sessionTitle: '1차 삼겹살',
        baseAmount: 30000,
        alcoholAmount: 0,
        subtotal: 30000,
      },
    ],
  },
];

beforeEach(() => {
  useAccountStore.getState().clearAccount();
});

describe('SettlementResult', () => {
  it('정산 결과를 멤버별로 렌더링', () => {
    render(
      <SettlementResult results={mockResults} payerName="앨리스" />,
    );

    expect(screen.getByText('밥')).toBeInTheDocument();
    expect(screen.getByText('찰리')).toBeInTheDocument();

    // 총액 표시 요소는 text-lg 클래스를 가진 span
    const totalAmounts = screen.getAllByText(/^\d{1,3}(,\d{3})*원$/);
    const boldAmounts = totalAmounts.filter(
      (el) => el.className.includes('text-lg'),
    );
    expect(boldAmounts).toHaveLength(2);
    expect(boldAmounts[0]).toHaveTextContent('50,000원');
    expect(boldAmounts[1]).toHaveTextContent('30,000원');
  });

  it('세션별 상세 내역을 표시', () => {
    render(
      <SettlementResult results={mockResults} payerName="앨리스" />,
    );

    expect(screen.getAllByText('1차 삼겹살')).toHaveLength(2);
    expect(screen.getByText(/\+ 주류 10,000/)).toBeInTheDocument();
  });

  it('totalAmount가 0 이하인 결과는 필터링', () => {
    const resultsWithZero: SettlementResultType[] = [
      {
        memberId: 'A',
        memberName: '앨리스',
        totalAmount: 0,
        details: [],
      },
      ...mockResults,
    ];

    render(
      <SettlementResult results={resultsWithZero} payerName="앨리스" />,
    );

    // 앨리스(0원)는 표시되지 않아야 함
    expect(screen.queryByText('앨리스')).not.toBeInTheDocument();
    expect(screen.getByText('밥')).toBeInTheDocument();
  });

  it('정산할 내역이 없으면 빈 상태 메시지 표시', () => {
    const emptyResults: SettlementResultType[] = [
      { memberId: 'A', memberName: '앨리스', totalAmount: 0, details: [] },
    ];

    render(
      <SettlementResult results={emptyResults} payerName="앨리스" />,
    );

    expect(screen.getByText('정산할 내역이 없습니다')).toBeInTheDocument();
  });

  it('계좌 정보가 있으면 복사 버튼 표시', () => {
    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '3333-01-1234567',
      ownerName: '앨리스',
    });

    render(
      <SettlementResult results={mockResults} payerName="앨리스" />,
    );

    const buttons = screen.getAllByRole('button', { name: /계좌번호 복사/ });
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toHaveTextContent('계좌 복사 (카카오뱅크)');
  });

  it('계좌 정보가 없으면 복사 버튼 미표시', () => {
    render(
      <SettlementResult results={mockResults} payerName="앨리스" />,
    );

    expect(
      screen.queryByRole('button', { name: /계좌번호 복사/ }),
    ).not.toBeInTheDocument();
  });

  it('계좌 복사 버튼 클릭 시 클립보드에 복사', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '3333-01-1234567',
      ownerName: '앨리스',
    });

    render(
      <SettlementResult results={mockResults} payerName="앨리스" />,
    );

    const buttons = screen.getAllByRole('button', { name: /계좌번호 복사/ });
    await user.click(buttons[0]);

    expect(writeTextMock).toHaveBeenCalledWith(
      '카카오뱅크 3333-01-1234567 앨리스',
    );
    expect(buttons[0]).toHaveTextContent('복사 완료!');
  });
});
