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

// ── Search & Sort ─────────────────────────────────────

describe('HistoryPage - 검색', () => {
  it('히스토리가 있을 때 검색 입력 필드가 표시됨', () => {
    setHistories([createHistory()]);
    render(<HistoryPage />);
    expect(screen.getByLabelText('정산 기록 검색')).toBeInTheDocument();
  });

  it('히스토리가 없을 때 검색 입력 필드가 표시되지 않음', () => {
    render(<HistoryPage />);
    expect(screen.queryByLabelText('정산 기록 검색')).not.toBeInTheDocument();
  });

  it('참여자 이름으로 검색 필터링', async () => {
    const user = userEvent.setup();
    const h1 = createHistory({ id: 'h1', title: '첫번째', memberNames: ['앨리스', '밥'] });
    const h2 = createHistory({ id: 'h2', title: '두번째', memberNames: ['찰리', '다이앤'] });
    setHistories([h1, h2]);

    render(<HistoryPage />);

    const searchInput = screen.getByLabelText('정산 기록 검색');
    await user.type(searchInput, '앨리스');

    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    expect(cards).toHaveLength(1);
    expect(screen.getByText('앨리스, 밥')).toBeInTheDocument();
  });

  it('제목으로 검색 필터링', async () => {
    const user = userEvent.setup();
    const h1 = createHistory({ id: 'h1', title: '회식 정산' });
    const h2 = createHistory({ id: 'h2', title: '여행 정산' });
    setHistories([h1, h2]);

    render(<HistoryPage />);

    const searchInput = screen.getByLabelText('정산 기록 검색');
    await user.type(searchInput, '회식');

    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    expect(cards).toHaveLength(1);
  });

  it('검색 결과가 없으면 빈 검색 결과 메시지를 표시', async () => {
    const user = userEvent.setup();
    setHistories([createHistory()]);

    render(<HistoryPage />);

    const searchInput = screen.getByLabelText('정산 기록 검색');
    await user.type(searchInput, '존재하지않는이름');

    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
  });

  it('검색은 대소문자를 구분하지 않음', async () => {
    const user = userEvent.setup();
    const h1 = createHistory({ id: 'h1', title: 'ABC 정산', memberNames: ['Alice'] });
    setHistories([h1]);

    render(<HistoryPage />);

    const searchInput = screen.getByLabelText('정산 기록 검색');
    await user.type(searchInput, 'alice');

    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    expect(cards).toHaveLength(1);
  });
});

describe('HistoryPage - 정렬', () => {
  it('정렬 칩 3개가 표시됨 (최신순, 오래된순, 금액 높은순)', () => {
    setHistories([createHistory()]);
    render(<HistoryPage />);

    expect(screen.getByText('최신순')).toBeInTheDocument();
    expect(screen.getByText('오래된순')).toBeInTheDocument();
    expect(screen.getByText('금액 높은순')).toBeInTheDocument();
  });

  it('기본 정렬은 최신순 (newest)', () => {
    setHistories([createHistory()]);
    render(<HistoryPage />);

    const newestChip = screen.getByText('최신순').closest('button');
    expect(newestChip).toHaveAttribute('aria-checked', 'true');
  });

  it('오래된순 클릭 시 정렬 변경', async () => {
    const user = userEvent.setup();
    const h1 = createHistory({ id: 'h1', title: '오래된것', createdAt: new Date(2024, 0, 1).getTime() });
    const h2 = createHistory({ id: 'h2', title: '최신것', createdAt: new Date(2024, 5, 1).getTime() });
    setHistories([h1, h2]);

    render(<HistoryPage />);

    await user.click(screen.getByText('오래된순'));

    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    // 오래된순이므로 '오래된것'이 먼저
    expect(cards[0]).toHaveAttribute('aria-label', '오래된것 정산 기록');
    expect(cards[1]).toHaveAttribute('aria-label', '최신것 정산 기록');
  });

  it('최신순 클릭 시 최신 항목이 먼저 표시', async () => {
    const user = userEvent.setup();
    const h1 = createHistory({ id: 'h1', title: '오래된것', createdAt: new Date(2024, 0, 1).getTime() });
    const h2 = createHistory({ id: 'h2', title: '최신것', createdAt: new Date(2024, 5, 1).getTime() });
    setHistories([h1, h2]);

    render(<HistoryPage />);

    // 먼저 오래된순으로 변경 후 다시 최신순으로
    await user.click(screen.getByText('오래된순'));
    await user.click(screen.getByText('최신순'));

    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    expect(cards[0]).toHaveAttribute('aria-label', '최신것 정산 기록');
    expect(cards[1]).toHaveAttribute('aria-label', '오래된것 정산 기록');
  });

  it('금액 높은순 클릭 시 금액이 높은 항목이 먼저 표시', async () => {
    const user = userEvent.setup();
    const h1 = createHistory({ id: 'h1', title: '적은금액', totalAmount: 50000 });
    const h2 = createHistory({ id: 'h2', title: '큰금액', totalAmount: 200000 });
    setHistories([h1, h2]);

    render(<HistoryPage />);

    await user.click(screen.getByText('금액 높은순'));

    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    expect(cards[0]).toHaveAttribute('aria-label', '큰금액 정산 기록');
    expect(cards[1]).toHaveAttribute('aria-label', '적은금액 정산 기록');
  });

  it('히스토리가 없을 때 정렬 칩이 표시되지 않음', () => {
    render(<HistoryPage />);
    expect(screen.queryByText('최신순')).not.toBeInTheDocument();
  });
});

describe('HistoryPage - 검색 + 정렬 조합', () => {
  it('검색 후 정렬이 적용됨', async () => {
    const user = userEvent.setup();
    const h1 = createHistory({
      id: 'h1',
      title: '회식A',
      memberNames: ['앨리스'],
      totalAmount: 50000,
      createdAt: new Date(2024, 0, 1).getTime(),
    });
    const h2 = createHistory({
      id: 'h2',
      title: '회식B',
      memberNames: ['앨리스', '밥'],
      totalAmount: 150000,
      createdAt: new Date(2024, 5, 1).getTime(),
    });
    const h3 = createHistory({
      id: 'h3',
      title: '여행',
      memberNames: ['찰리'],
      totalAmount: 300000,
      createdAt: new Date(2024, 3, 1).getTime(),
    });
    setHistories([h1, h2, h3]);

    render(<HistoryPage />);

    // 검색으로 '회식' 필터링 → h1, h2만 남음
    const searchInput = screen.getByLabelText('정산 기록 검색');
    await user.type(searchInput, '회식');

    // 금액 높은순 정렬 → h2(150000) > h1(50000)
    await user.click(screen.getByText('금액 높은순'));

    const cards = screen.getAllByRole('button', { name: /정산 기록$/ });
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('aria-label', '회식B 정산 기록');
    expect(cards[1]).toHaveAttribute('aria-label', '회식A 정산 기록');
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
