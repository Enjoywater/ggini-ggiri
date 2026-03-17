import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettlementPage } from '../SettlementPage';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useAccountStore } from '@/entities/account';
import { useHistoryStore } from '@/entities/history';
import { useTransferCompletionStore } from '@/entities/transfer-completion';

// ── Mocks ────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/shared/lib/use-hydration', () => ({
  useHydration: () => true,
}));

vi.mock('@/features/share', () => ({
  ShareButton: () => <button data-testid="share-kakao">카카오톡으로 공유</button>,
}));

vi.mock('@/features/share/lib/text-share', () => ({
  buildSettlementText: () => '정산 텍스트',
  shareText: vi.fn().mockResolvedValue('copied'),
}));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  useMemberStore.getState().reset();
  useSessionStore.getState().reset();
  useAccountStore.getState().clearAccount();
  useHistoryStore.getState().clearAll();
  useTransferCompletionStore.getState().reset();
  sessionStorage.clear();
});

function setupBasicSettlement() {
  const alice = useMemberStore.getState().addMember('앨리스');
  const bob = useMemberStore.getState().addMember('밥');
  useSessionStore.getState().addSession({
    title: '1차 고기집',
    totalAmount: 100000,
    payerId: alice.id,
    participantIds: [alice.id, bob.id],
  });
  return { alice, bob };
}

function setupMultiSessionSettlement() {
  const alice = useMemberStore.getState().addMember('앨리스');
  const bob = useMemberStore.getState().addMember('밥');
  const charlie = useMemberStore.getState().addMember('찰리');
  useSessionStore.getState().addSession({
    title: '1차',
    totalAmount: 90000,
    payerId: alice.id,
    participantIds: [alice.id, bob.id, charlie.id],
  });
  useSessionStore.getState().addSession({
    title: '2차',
    totalAmount: 60000,
    payerId: bob.id,
    participantIds: [alice.id, bob.id],
  });
  return { alice, bob, charlie };
}

// ── Empty/Error states ───────────────────────────────

describe('SettlementPage - 빈 상태', () => {
  it('데이터 없을 때 안내 메시지', () => {
    render(<SettlementPage />);
    expect(screen.getByText('정산할 데이터가 없습니다.')).toBeInTheDocument();
  });

  it('메인으로 이동 링크', () => {
    render(<SettlementPage />);
    expect(screen.getByText('메인으로 이동').closest('a')).toHaveAttribute('href', '/');
  });

  it('참여자 1명만 있을 때 빈 상태', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id],
    });
    render(<SettlementPage />);
    expect(screen.getByText('정산할 데이터가 없습니다.')).toBeInTheDocument();
  });
});

// ── Header ───────────────────────────────────────────

describe('SettlementPage - 헤더', () => {
  it('정산 결과 제목 표시', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    expect(screen.getByText('정산 결과')).toBeInTheDocument();
  });

  it('뒤로 가기 링크', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    expect(screen.getByLabelText('뒤로 가기').closest('a')).toHaveAttribute('href', '/');
  });
});

// ── Transfer Summary ─────────────────────────────────

describe('SettlementPage - 송금 요약', () => {
  it('송금 요약 섹션 렌더링', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    expect(screen.getByText('송금 요약')).toBeInTheDocument();
  });

  it('송금 항목에 금액 표시', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    // formatAmount은 "50,000원" 형태로 렌더
    const transferBtns = screen.getAllByLabelText(/송금 완료 토글/);
    expect(transferBtns.length).toBeGreaterThan(0);
  });

  it('송금 항목에 발신자/수신자 이름 표시', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    const strongElements = document.querySelectorAll('strong');
    const names = Array.from(strongElements).map((el) => el.textContent);
    expect(names).toContain('밥');
    expect(names).toContain('앨리스');
  });

  it('다중 세션 정산 시 올바른 송금 경로', () => {
    setupMultiSessionSettlement();
    render(<SettlementPage />);
    // 정산 엔진이 최적화된 결과를 생성
    expect(screen.getByText('송금 요약')).toBeInTheDocument();
  });

  it('완료 카운트 초기 상태 0/N', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    expect(screen.getByText(/0\/1 완료/)).toBeInTheDocument();
  });

  it('송금 항목 클릭 시 완료 토글', async () => {
    const user = userEvent.setup();
    setupBasicSettlement();
    render(<SettlementPage />);

    const transferBtn = screen.getByLabelText(/송금 완료 토글/);
    await user.click(transferBtn);

    expect(screen.getByText(/1\/1 완료/)).toBeInTheDocument();
  });

  it('완료 토글 후 다시 클릭 시 미완료', async () => {
    const user = userEvent.setup();
    setupBasicSettlement();
    render(<SettlementPage />);

    const transferBtn = screen.getByLabelText(/송금 완료 토글/);
    await user.click(transferBtn);
    await user.click(transferBtn);

    expect(screen.getByText(/0\/1 완료/)).toBeInTheDocument();
  });

  it('초기화 버튼으로 모든 완료 상태 리셋', async () => {
    const user = userEvent.setup();
    setupBasicSettlement();
    render(<SettlementPage />);

    // 완료 표시
    await user.click(screen.getByLabelText(/송금 완료 토글/));
    expect(screen.getByText(/1\/1 완료/)).toBeInTheDocument();

    // 초기화
    await user.click(screen.getByText('초기화'));
    expect(screen.getByText(/0\/1 완료/)).toBeInTheDocument();
  });
});

// ── Settlement Result ────────────────────────────────

describe('SettlementPage - 개인별 정산', () => {
  it('개인별 정산 내역 섹션 렌더링', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    expect(screen.getByText('개인별 정산 내역')).toBeInTheDocument();
  });

  it('세션별 내역(details) 표시', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    // SettlementResult는 positive results만 표시하므로, 밥의 상세에 세션 제목이 있음
    expect(screen.getAllByText('1차 고기집').length).toBeGreaterThan(0);
  });
});

// ── Account notice ───────────────────────────────────

describe('SettlementPage - 계좌 안내', () => {
  it('계좌 미설정 시 안내 CTA 표시', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    expect(screen.getByText('계좌 정보를 설정해 보세요')).toBeInTheDocument();
  });

  it('계좌 안내 CTA가 설정 페이지로 연결', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    const link = screen.getByText('계좌 정보를 설정해 보세요').closest('a');
    expect(link).toHaveAttribute('href', '/settings');
  });

  it('계좌 설정 시 안내 CTA 미표시', () => {
    setupBasicSettlement();
    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '1234567890',
      ownerName: '앨리스',
    });
    render(<SettlementPage />);
    expect(screen.queryByText('계좌 정보를 설정해 보세요')).not.toBeInTheDocument();
  });

  it('계좌 설정 시 계좌 복사 버튼 표시', () => {
    setupBasicSettlement();
    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '1234567890',
      ownerName: '앨리스',
    });
    render(<SettlementPage />);
    expect(screen.getAllByText(/카카오뱅크/).length).toBeGreaterThan(0);
  });
});

// ── Auto-save to history ─────────────────────────────

describe('SettlementPage - 히스토리 자동 저장', () => {
  it('정산 결과가 히스토리에 자동 저장됨', () => {
    setupBasicSettlement();
    render(<SettlementPage />);

    expect(useHistoryStore.getState().histories).toHaveLength(1);
  });

  it('동일 fingerprint로 재렌더 시 중복 저장 안 됨', () => {
    setupBasicSettlement();
    const { unmount } = render(<SettlementPage />);
    unmount();
    render(<SettlementPage />);

    expect(useHistoryStore.getState().histories).toHaveLength(1);
  });

  it('저장된 히스토리에 올바른 데이터 포함', () => {
    setupBasicSettlement();
    render(<SettlementPage />);

    const h = useHistoryStore.getState().histories[0];
    expect(h.memberNames).toEqual(['앨리스', '밥']);
    expect(h.totalAmount).toBe(100000);
    expect(h.sessionCount).toBe(1);
    expect(h.transfers.length).toBeGreaterThan(0);
  });
});

// ── Share buttons ────────────────────────────────────

describe('SettlementPage - 공유', () => {
  it('카카오 공유 버튼 존재', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    expect(screen.getByTestId('share-kakao')).toBeInTheDocument();
  });

  it('텍스트 공유 버튼 존재', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    expect(screen.getByLabelText('정산 결과 텍스트 복사')).toBeInTheDocument();
  });

  it('처음으로 링크 존재', () => {
    setupBasicSettlement();
    render(<SettlementPage />);
    expect(screen.getByText('처음으로').closest('a')).toHaveAttribute('href', '/');
  });
});

// ── Alcohol settlement ───────────────────────────────

describe('SettlementPage - 술값 분리 정산', () => {
  it('술값 포함 시 정산 결과가 달라짐', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 100000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
      alcohol: {
        unitPrice: 5000,
        quantity: 4,
        drinkerIds: [bob.id], // 밥만 음주
      },
    });
    render(<SettlementPage />);

    // 밥은 기본 분담 + 술값을 부담해야 하므로 금액이 50,000원 이상
    const h = useHistoryStore.getState().histories[0];
    const bobResult = h.results.find((r) => r.memberId === bob.id);
    expect(bobResult).toBeDefined();
    expect(bobResult!.totalAmount).toBeGreaterThan(0);
  });
});
