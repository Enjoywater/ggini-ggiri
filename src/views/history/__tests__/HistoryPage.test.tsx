import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryPage } from '../HistoryPage';
import { useHistoryStore } from '@/entities/history';
import type { SettlementHistory } from '@/shared/types';

// ═══════════════════════════════════════════════════════
// HistoryPage 뷰 레이어 테스트
// ═══════════════════════════════════════════════════════

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock useHydration - default returns true (hydrated)
const mockUseHydration = vi.fn(() => true);
vi.mock('@/shared/lib/use-hydration', () => ({
  useHydration: () => mockUseHydration(),
}));

// Mock SettlementResult widget to simplify tests
vi.mock('@/widgets/settlement-result', () => ({
  SettlementResult: ({ payerName }: { payerName: string }) => (
    <div data-testid="settlement-result">정산 상세: {payerName}</div>
  ),
}));

// jsdom does not implement HTMLDialogElement showModal/close
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

// ── Test data ──────────────────────────────────────────

function createHistory(overrides: Partial<SettlementHistory> = {}): SettlementHistory {
  return {
    id: 'h1',
    createdAt: new Date(2024, 2, 12).getTime(),
    title: '2024.03.12 정산',
    memberNames: ['앨리스', '밥'],
    totalAmount: 100000,
    sessionCount: 1,
    members: [
      { id: 'a1', name: '앨리스' },
      { id: 'b1', name: '밥' },
    ],
    sessions: [
      {
        id: 's1',
        title: '1차 고기집',
        totalAmount: 100000,
        payerId: 'a1',
        participantIds: ['a1', 'b1'],
      },
    ],
    results: [
      {
        memberId: 'b1',
        memberName: '밥',
        totalAmount: 50000,
        details: [
          {
            sessionId: 's1',
            sessionTitle: '1차 고기집',
            baseAmount: 50000,
            alcoholAmount: 0,
            subtotal: 50000,
          },
        ],
      },
    ],
    transfers: [{ from: 'b1', to: 'a1', amount: 50000 }],
    ...overrides,
  };
}

function setHistories(histories: SettlementHistory[]) {
  useHistoryStore.setState({ histories });
}

beforeEach(() => {
  useHistoryStore.getState().clearAll();
});

// ── Empty state ────────────────────────────────────────

describe('HistoryPage - 빈 상태', () => {
  it('히스토리가 없을 때 빈 상태 메시지를 표시', () => {
    render(<HistoryPage />);
    expect(screen.getByText('아직 정산 기록이 없습니다')).toBeInTheDocument();
  });

  it('빈 상태에서 히스토리 카드 삭제 버튼이 없음', () => {
    render(<HistoryPage />);
    // No history card delete buttons (aria-label ends with "삭제")
    // Modal may still render the "삭제" confirm button in DOM, so check for card-level buttons only
    expect(screen.queryByRole('button', { name: /정산 기록$/ })).not.toBeInTheDocument();
  });
});

// ── Header ─────────────────────────────────────────────

describe('HistoryPage - 헤더', () => {
  it('정산 기록 제목을 표시', () => {
    render(<HistoryPage />);
    expect(screen.getByText('정산 기록')).toBeInTheDocument();
  });

  it('뒤로 가기 링크가 존재', () => {
    render(<HistoryPage />);
    const backLink = screen.getByLabelText('뒤로 가기');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });
});

// ── History list rendering ─────────────────────────────

describe('HistoryPage - 목록 렌더링', () => {
  it('히스토리 아이템 수만큼 카드가 렌더링', () => {
    const h1 = createHistory({ id: 'h1' });
    const h2 = createHistory({ id: 'h2', title: '2024.03.13 정산' });
    setHistories([h1, h2]);

    render(<HistoryPage />);
    const buttons = screen.getAllByRole('button', { name: /정산 기록$/ });
    expect(buttons).toHaveLength(2);
  });

  it('카드에 날짜를 YYYY.MM.DD 형식으로 표시', () => {
    setHistories([createHistory()]);
    render(<HistoryPage />);
    expect(screen.getByText('2024.03.12')).toBeInTheDocument();
  });

  it('카드에 총 금액을 원 단위로 표시', () => {
    setHistories([createHistory()]);
    render(<HistoryPage />);
    expect(screen.getByText('100,000원')).toBeInTheDocument();
  });

  it('카드에 N차 정보를 표시', () => {
    setHistories([createHistory({ sessionCount: 3 })]);
    render(<HistoryPage />);
    expect(screen.getByText('3차')).toBeInTheDocument();
  });

  it('멤버 이름을 표시 (3명 이하)', () => {
    setHistories([createHistory({ memberNames: ['앨리스', '밥'] })]);
    render(<HistoryPage />);
    expect(screen.getByText('앨리스, 밥')).toBeInTheDocument();
  });

  it('멤버 이름이 3명 초과일 때 "외 N명" 으로 축약', () => {
    setHistories([
      createHistory({
        memberNames: ['앨리스', '밥', '찰리', '다이앤', '에드'],
      }),
    ]);
    render(<HistoryPage />);
    expect(screen.getByText(/앨리스, 밥, 찰리/)).toBeInTheDocument();
    expect(screen.getByText(/외 2명/)).toBeInTheDocument();
  });

  it('정확히 3명일 때 모두 표시', () => {
    setHistories([
      createHistory({
        memberNames: ['앨리스', '밥', '찰리'],
      }),
    ]);
    render(<HistoryPage />);
    expect(screen.getByText('앨리스, 밥, 찰리')).toBeInTheDocument();
  });

  it('각 카드에 삭제 버튼이 존재', () => {
    const h1 = createHistory({ id: 'h1', title: '첫번째' });
    const h2 = createHistory({ id: 'h2', title: '두번째' });
    setHistories([h1, h2]);

    render(<HistoryPage />);
    expect(screen.getByLabelText('첫번째 삭제')).toBeInTheDocument();
    expect(screen.getByLabelText('두번째 삭제')).toBeInTheDocument();
  });
});

// ── Expand / Collapse ──────────────────────────────────

describe('HistoryPage - 확장/축소', () => {
  it('초기 상태에서 상세 내용이 보이지 않음', () => {
    setHistories([createHistory()]);
    render(<HistoryPage />);
    expect(screen.queryByTestId('settlement-result')).not.toBeInTheDocument();
  });

  it('카드 클릭 시 상세 내용이 펼쳐짐', async () => {
    const user = userEvent.setup();
    setHistories([createHistory()]);
    render(<HistoryPage />);

    const card = screen.getByRole('button', { name: /정산 기록$/ });
    await user.click(card);

    expect(screen.getByTestId('settlement-result')).toBeInTheDocument();
  });

  it('펼쳐진 카드를 다시 클릭하면 접힘', async () => {
    const user = userEvent.setup();
    setHistories([createHistory()]);
    render(<HistoryPage />);

    const card = screen.getByRole('button', { name: /정산 기록$/ });
    await user.click(card); // expand
    expect(screen.getByTestId('settlement-result')).toBeInTheDocument();

    await user.click(card); // collapse
    expect(screen.queryByTestId('settlement-result')).not.toBeInTheDocument();
  });

  it('한 번에 하나의 카드만 펼쳐짐', async () => {
    const user = userEvent.setup();
    const h1 = createHistory({ id: 'h1', title: '첫번째' });
    const h2 = createHistory({ id: 'h2', title: '두번째' });
    setHistories([h1, h2]);

    render(<HistoryPage />);

    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    await user.click(cards[0]); // expand first
    expect(screen.getAllByTestId('settlement-result')).toHaveLength(1);

    await user.click(cards[1]); // expand second → first collapses
    expect(screen.getAllByTestId('settlement-result')).toHaveLength(1);
  });

  it('aria-expanded 속성이 올바르게 토글됨', async () => {
    const user = userEvent.setup();
    setHistories([createHistory()]);
    render(<HistoryPage />);

    const card = screen.getByRole('button', { name: /정산 기록$/ });
    expect(card).toHaveAttribute('aria-expanded', 'false');

    await user.click(card);
    expect(card).toHaveAttribute('aria-expanded', 'true');

    await user.click(card);
    expect(card).toHaveAttribute('aria-expanded', 'false');
  });

  it('확장 시 송금 요약(transfer) 정보를 표시', async () => {
    const user = userEvent.setup();
    setHistories([createHistory()]);
    render(<HistoryPage />);

    await user.click(screen.getByRole('button', { name: /정산 기록$/ }));

    expect(screen.getByText('송금 요약')).toBeInTheDocument();
    // Transfer row uses <strong> tags for names
    const strongElements = document.querySelectorAll('strong');
    const transferNames = Array.from(strongElements).map((el) => el.textContent);
    expect(transferNames).toContain('밥');
    expect(transferNames).toContain('앨리스');
  });

  it('전송 내역이 없으면 송금 요약을 표시하지 않음', async () => {
    const user = userEvent.setup();
    setHistories([createHistory({ transfers: [] })]);
    render(<HistoryPage />);

    await user.click(screen.getByRole('button', { name: /정산 기록$/ }));
    expect(screen.queryByText('송금 요약')).not.toBeInTheDocument();
  });
});

// ── Delete flow ────────────────────────────────────────

describe('HistoryPage - 삭제 플로우', () => {
  it('삭제 버튼 클릭 시 확인 모달이 열림', async () => {
    const user = userEvent.setup();
    setHistories([createHistory({ title: '테스트' })]);
    render(<HistoryPage />);

    await user.click(screen.getByLabelText('테스트 삭제'));
    expect(screen.getByText('정산 기록 삭제')).toBeInTheDocument();
    expect(screen.getByText(/삭제된 기록은 복구할 수 없습니다/)).toBeInTheDocument();
  });

  it('삭제 버튼 클릭 시 카드가 펼쳐지지 않음 (이벤트 전파 차단)', async () => {
    const user = userEvent.setup();
    setHistories([createHistory({ title: '테스트' })]);
    render(<HistoryPage />);

    await user.click(screen.getByLabelText('테스트 삭제'));
    // Card should not expand
    expect(screen.queryByTestId('settlement-result')).not.toBeInTheDocument();
  });

  it('모달에서 취소 클릭 시 항목이 유지됨', async () => {
    const user = userEvent.setup();
    setHistories([createHistory({ title: '테스트' })]);
    render(<HistoryPage />);

    await user.click(screen.getByLabelText('테스트 삭제'));

    // Click cancel button in modal (hidden because dialog not truly open in jsdom)
    const cancelButton = screen.getByRole('button', { name: '취소', hidden: true });
    await user.click(cancelButton);

    // Item should still be there
    expect(useHistoryStore.getState().histories).toHaveLength(1);
  });

  it('모달에서 삭제 확인 시 항목이 제거됨', async () => {
    const user = userEvent.setup();
    setHistories([createHistory({ title: '테스트' })]);
    render(<HistoryPage />);

    await user.click(screen.getByLabelText('테스트 삭제'));

    // Click the danger delete button in modal
    const confirmButton = screen.getByRole('button', { name: '삭제', hidden: true });
    await user.click(confirmButton);

    expect(useHistoryStore.getState().histories).toHaveLength(0);
  });

  it('삭제 확인 후 펼쳐진 상태가 초기화됨', async () => {
    const user = userEvent.setup();
    const h1 = createHistory({ id: 'h1', title: '첫번째' });
    const h2 = createHistory({ id: 'h2', title: '두번째' });
    setHistories([h1, h2]);

    render(<HistoryPage />);

    // Expand h1
    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    await user.click(cards[0]);
    expect(screen.getByTestId('settlement-result')).toBeInTheDocument();

    // Delete h1
    await user.click(screen.getByLabelText('첫번째 삭제'));
    const confirmButton = screen.getByRole('button', { name: '삭제', hidden: true });
    await user.click(confirmButton);

    // h1 is removed, expanded state should be cleared
    expect(screen.queryByTestId('settlement-result')).not.toBeInTheDocument();
  });

  it('모달에서 삭제/취소 버튼 둘 다 존재', async () => {
    const user = userEvent.setup();
    setHistories([createHistory({ title: '테스트' })]);
    render(<HistoryPage />);

    await user.click(screen.getByLabelText('테스트 삭제'));
    expect(screen.getByRole('button', { name: '취소', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제', hidden: true })).toBeInTheDocument();
  });
});

// ── Hydration ──────────────────────────────────────────

describe('HistoryPage - hydration', () => {
  it('하이드레이션 전 로딩 상태를 표시', () => {
    mockUseHydration.mockReturnValueOnce(false);

    render(<HistoryPage />);
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });
});

// ── HistoryDetail sub-component ────────────────────────

describe('HistoryPage - HistoryDetail 렌더링', () => {
  it('mainPayer를 올바르게 결정하여 SettlementResult에 전달', async () => {
    const user = userEvent.setup();
    setHistories([createHistory()]);
    render(<HistoryPage />);

    await user.click(screen.getByRole('button', { name: /정산 기록$/ }));

    // SettlementResult mock receives payerName
    expect(screen.getByText('정산 상세: 앨리스')).toBeInTheDocument();
  });

  it('여러 세션에서 가장 많이 결제한 사람을 mainPayer로 선택', async () => {
    const user = userEvent.setup();
    const history = createHistory({
      members: [
        { id: 'a1', name: '앨리스' },
        { id: 'b1', name: '밥' },
      ],
      sessions: [
        {
          id: 's1',
          title: '1차',
          totalAmount: 30000,
          payerId: 'a1',
          participantIds: ['a1', 'b1'],
        },
        {
          id: 's2',
          title: '2차',
          totalAmount: 70000,
          payerId: 'b1',
          participantIds: ['a1', 'b1'],
        },
      ],
    });
    setHistories([history]);
    render(<HistoryPage />);

    await user.click(screen.getByRole('button', { name: /정산 기록$/ }));
    // 밥이 70000원으로 더 많이 결제 → mainPayer
    expect(screen.getByText('정산 상세: 밥')).toBeInTheDocument();
  });

  it('송금 항목이 여러개일 때 모두 렌더링', async () => {
    const user = userEvent.setup();
    const history = createHistory({
      members: [
        { id: 'a1', name: '앨리스' },
        { id: 'b1', name: '밥' },
        { id: 'c1', name: '찰리' },
      ],
      transfers: [
        { from: 'b1', to: 'a1', amount: 30000 },
        { from: 'c1', to: 'a1', amount: 20000 },
      ],
    });
    setHistories([history]);
    render(<HistoryPage />);

    await user.click(screen.getByRole('button', { name: /정산 기록$/ }));

    expect(screen.getByText('30,000원')).toBeInTheDocument();
    expect(screen.getByText('20,000원')).toBeInTheDocument();
  });
});

// ── Multiple items ─────────────────────────────────────

describe('HistoryPage - 다수 아이템', () => {
  it('10개 항목이 모두 렌더링됨', () => {
    const histories = Array.from({ length: 10 }, (_, i) =>
      createHistory({
        id: `h${i}`,
        title: `정산 ${i}`,
        createdAt: Date.now() - i * 86400000,
      }),
    );
    setHistories(histories);
    render(<HistoryPage />);

    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    expect(cards).toHaveLength(10);
  });
});

// ── Animation ───────────────────────────────────────

describe('HistoryPage - 애니메이션', () => {
  it('빈 기록에 animate-breathing 클래스', () => {
    render(<HistoryPage />);
    const emptyText = screen.getByText('아직 정산 기록이 없습니다');
    expect(emptyText.className).toContain('animate-breathing');
  });
});
