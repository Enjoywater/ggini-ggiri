import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionCard } from '../SessionCard';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import type { Session } from '@/shared/types';

beforeEach(() => {
  useMemberStore.getState().reset();
  useSessionStore.getState().reset();
});

function setupMembers() {
  const alice = useMemberStore.getState().addMember('앨리스');
  const bob = useMemberStore.getState().addMember('밥');
  const charlie = useMemberStore.getState().addMember('찰리');
  return { alice, bob, charlie };
}

function createSession(overrides: Partial<Session> = {}): Session {
  const members = useMemberStore.getState().members;
  return useSessionStore.getState().addSession({
    title: '1차',
    totalAmount: 90000,
    payerId: members[0].id,
    participantIds: members.map((m) => m.id),
    ...overrides,
  });
}

function renderCard(session: Session, index = 0) {
  const onRemove = vi.fn();
  const onDuplicate = vi.fn();
  const result = render(
    <SessionCard
      session={session}
      index={index}
      onRemove={onRemove}
      onDuplicate={onDuplicate}
    />,
  );
  return { ...result, onRemove, onDuplicate };
}

// ── Basic rendering ──────────────────────────────────

describe('SessionCard - 기본 렌더링', () => {
  it('세션 제목 표시', () => {
    setupMembers();
    const session = createSession({ title: '고기집' });
    renderCard(session);
    expect(screen.getByText('고기집')).toBeInTheDocument();
  });

  it('제목 없으면 Chip 배지에 차수 표시', () => {
    setupMembers();
    const session = createSession({ title: '' });
    renderCard(session, 2);
    expect(screen.getByText('3차')).toBeInTheDocument();
  });

  it('금액 입력 필드 렌더링', () => {
    setupMembers();
    const session = createSession({ totalAmount: 50000 });
    renderCard(session);
    expect(screen.getByDisplayValue('50,000')).toBeInTheDocument();
  });

  it('결제자 Chip 렌더링', () => {
    setupMembers();
    const members = useMemberStore.getState().members;
    const session = createSession({ payerId: members[0].id });
    renderCard(session);

    expect(screen.getByLabelText('앨리스을(를) 결제자로 선택')).toBeInTheDocument();
    expect(screen.getByLabelText('밥을(를) 결제자로 선택')).toBeInTheDocument();
    expect(screen.getByLabelText('찰리을(를) 결제자로 선택')).toBeInTheDocument();
  });

  it('참여자 Chip 렌더링', () => {
    setupMembers();
    const session = createSession();
    renderCard(session);

    expect(screen.getByLabelText('앨리스 참여 토글')).toBeInTheDocument();
    expect(screen.getByLabelText('밥 참여 토글')).toBeInTheDocument();
    expect(screen.getByLabelText('찰리 참여 토글')).toBeInTheDocument();
  });

  it('복제/삭제 버튼 존재', () => {
    setupMembers();
    const session = createSession({ title: '1차' });
    renderCard(session);
    expect(screen.getByLabelText('1차 복제')).toBeInTheDocument();
    expect(screen.getByLabelText('1차 삭제')).toBeInTheDocument();
  });
});

// ── Interactions ─────────────────────────────────────

describe('SessionCard - 인터랙션', () => {
  it('결제자 변경', async () => {
    const user = userEvent.setup();
    const { bob } = setupMembers();
    const session = createSession();
    renderCard(session);

    await user.click(screen.getByLabelText('밥을(를) 결제자로 선택'));
    expect(useSessionStore.getState().sessions[0].payerId).toBe(bob.id);
  });

  it('참여자 토글', async () => {
    const user = userEvent.setup();
    const { charlie } = setupMembers();
    const session = createSession();
    renderCard(session);

    // 찰리 참여 해제
    await user.click(screen.getByLabelText('찰리 참여 토글'));
    expect(useSessionStore.getState().sessions[0].participantIds).not.toContain(charlie.id);
  });

  it('금액 변경 시 스토어 업데이트', () => {
    setupMembers();
    const session = createSession({ totalAmount: 50000 });
    renderCard(session);

    // 금액이 50,000으로 표시되는지 확인
    expect(screen.getByDisplayValue('50,000')).toBeInTheDocument();
    // 스토어에 올바른 값이 있는지 확인
    expect(useSessionStore.getState().sessions[0].totalAmount).toBe(50000);
  });

  it('삭제 콜백 호출', async () => {
    const user = userEvent.setup();
    setupMembers();
    const session = createSession({ title: '1차' });
    const { onRemove } = renderCard(session);

    await user.click(screen.getByLabelText('1차 삭제'));
    expect(onRemove).toHaveBeenCalledWith(session.id);
  });

  it('복제 콜백 호출', async () => {
    const user = userEvent.setup();
    setupMembers();
    const session = createSession({ title: '1차' });
    const { onDuplicate } = renderCard(session);

    await user.click(screen.getByLabelText('1차 복제'));
    expect(onDuplicate).toHaveBeenCalledWith(session.id);
  });
});

// ── Toggle all participants ──────────────────────────

describe('SessionCard - 전체 선택/해제', () => {
  it('전체 선택 상태에서 전체 해제 버튼 표시', () => {
    setupMembers();
    const session = createSession(); // 전원 참여
    renderCard(session);

    expect(screen.getByLabelText('참여자 전체 해제')).toBeInTheDocument();
  });

  it('일부만 참여 시 전체 선택 버튼 표시', () => {
    const { alice } = setupMembers();
    const bob = useMemberStore.getState().members[1];
    const session = createSession({ participantIds: [alice.id, bob.id] }); // 찰리 빠짐
    renderCard(session);

    expect(screen.getByLabelText('참여자 전체 선택')).toBeInTheDocument();
  });

  it('전체 선택 버튼 클릭 시 모든 멤버 참여', async () => {
    const user = userEvent.setup();
    const { alice } = setupMembers();
    const session = createSession({ participantIds: [alice.id] });
    renderCard(session);

    await user.click(screen.getByText('전체 선택'));
    const updated = useSessionStore.getState().sessions[0];
    expect(updated.participantIds).toHaveLength(3);
  });

  it('전체 해제 버튼 클릭 시 결제자만 남음', async () => {
    const user = userEvent.setup();
    const { alice } = setupMembers();
    const session = createSession({ payerId: alice.id });
    renderCard(session);

    await user.click(screen.getByText('전체 해제'));
    const updated = useSessionStore.getState().sessions[0];
    // 결제자는 유지
    expect(updated.participantIds).toContain(alice.id);
  });
});

// ── Alcohol ──────────────────────────────────────────

describe('SessionCard - 술값 별도 정산', () => {
  it('기본적으로 술값 비활성화', () => {
    setupMembers();
    const session = createSession();
    renderCard(session);
    expect(screen.queryByText('주류 단가')).not.toBeInTheDocument();
  });

  it('술값 스위치 활성화 시 주류 입력 표시', async () => {
    const user = userEvent.setup();
    setupMembers();
    const session = createSession();
    renderCard(session);

    const switchBtn = screen.getByText('술값 별도 정산');
    await user.click(switchBtn);

    expect(useSessionStore.getState().sessions[0].alcohol).toBeDefined();
  });

  it('술값 비활성화 시 주류 데이터 제거', async () => {
    const user = userEvent.setup();
    setupMembers();
    const session = createSession({
      alcohol: { unitPrice: 5000, quantity: 3, drinkerIds: [] },
    });
    renderCard(session);

    const switchBtn = screen.getByText('술값 별도 정산');
    await user.click(switchBtn);

    expect(useSessionStore.getState().sessions[0].alcohol).toBeUndefined();
  });

  it('술값이 총액 초과 시 경고 메시지', () => {
    setupMembers();
    const session = createSession({
      totalAmount: 50000,
      alcohol: { unitPrice: 10000, quantity: 6, drinkerIds: [] },
    });
    renderCard(session);
    expect(screen.getByText(/초과합니다/)).toBeInTheDocument();
  });

  it('음주자 전체 선택/해제', async () => {
    const user = userEvent.setup();
    setupMembers();
    const session = createSession({
      alcohol: { unitPrice: 5000, quantity: 3, drinkerIds: [] },
    });
    renderCard(session);

    // 전체 선택
    const allDrinkerBtns = screen.getAllByText('전체 선택');
    // 두 번째가 음주자 전체 선택
    await user.click(allDrinkerBtns[allDrinkerBtns.length - 1]);

    const updated = useSessionStore.getState().sessions[0];
    expect(updated.alcohol!.drinkerIds).toHaveLength(3);
  });

  it('음주자 전체 해제 시 alcohol 섹션 자동 OFF', async () => {
    const user = userEvent.setup();
    const { alice, bob, charlie } = setupMembers();
    const session = createSession({
      alcohol: { unitPrice: 5000, quantity: 3, drinkerIds: [alice.id, bob.id, charlie.id] },
    });
    renderCard(session);

    // 전체 해제 클릭 (음주자 영역의 전체 해제 버튼)
    const allDrinkerBtn = screen.getByLabelText('음주자 전체 해제');
    await user.click(allDrinkerBtn);

    const updated = useSessionStore.getState().sessions[0];
    expect(updated.alcohol).toBeUndefined();
  });
});

// ── Alcohol animation ────────────────────────────────

describe('SessionCard - 술값 애니메이션', () => {
  it('술값 비활성화 시 gridTemplateRows가 0fr', () => {
    setupMembers();
    const session = createSession();
    renderCard(session);

    const gridContainer = document.querySelector('[style*="grid-template-rows"]') as HTMLElement;
    if (gridContainer) {
      expect(gridContainer.style.gridTemplateRows).toBe('0fr');
    }
  });

  it('술값 활성화 시 gridTemplateRows가 1fr', () => {
    setupMembers();
    const session = createSession({
      alcohol: { unitPrice: 5000, quantity: 3, drinkerIds: [] },
    });
    renderCard(session);

    const gridContainer = document.querySelector('[style*="grid-template-rows"]') as HTMLElement;
    if (gridContainer) {
      expect(gridContainer.style.gridTemplateRows).toBe('1fr');
    }
  });

  it('술값 영역에 grid 애니메이션 적용', () => {
    setupMembers();
    const session = createSession();
    renderCard(session);

    const gridEl = document.querySelector('.grid.transition-\\[grid-template-rows\\]') as HTMLElement;
    expect(gridEl).toBeTruthy();
    expect(gridEl.style.gridTemplateRows).toBe('0fr');
  });
});

// ── Badge & Stripe ──────────────────────────────────

describe('SessionCard - 차수 배지 및 컬러 스트라이프', () => {
  it('차수 배지 Chip이 role="status"로 렌더링', () => {
    setupMembers();
    const session = createSession({ title: '고기집' });
    renderCard(session, 0);
    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('1차');
  });

  it('제목이 있으면 배지와 제목이 분리 표시', () => {
    setupMembers();
    const session = createSession({ title: '고기집' });
    renderCard(session, 0);
    expect(screen.getByRole('status')).toHaveTextContent('1차');
    expect(screen.getByText('고기집')).toBeInTheDocument();
  });

  it('인덱스에 따라 배지 번호 증가', () => {
    setupMembers();
    const session = createSession({ title: '' });
    renderCard(session, 4);
    expect(screen.getByRole('status')).toHaveTextContent('5차');
  });

  it('Card에 accentColor에 의한 좌측 보더 적용', () => {
    setupMembers();
    const session = createSession();
    const { container } = renderCard(session, 0);
    // index 0 → PASTEL_COLORS[0] = 'pink' → border-l-pastel-pink-dark
    const card = container.querySelector('.border-l-4');
    expect(card).toBeInTheDocument();
  });

  it('5개 이상 세션에서 컬러가 순환', () => {
    setupMembers();
    const session = createSession();
    const { container } = renderCard(session, 5);
    // index 5 % 5 = 0 → 'pink' again
    const card = container.querySelector('.border-l-pastel-pink-dark');
    expect(card).toBeInTheDocument();
  });

  it('배지 Chip은 pointer-events-none으로 클릭 불가', () => {
    setupMembers();
    const session = createSession();
    renderCard(session, 0);
    const badge = screen.getByRole('status');
    expect(badge.className).toContain('pointer-events-none');
  });
});

// ── Focus select ────────────────────────────────────

describe('SessionCard - 금액 focus 시 전체선택', () => {
  it('총 금액 input focus 시 select 호출', async () => {
    const user = userEvent.setup();
    setupMembers();
    const session = createSession({ totalAmount: 50000 });
    renderCard(session);

    const input = screen.getByDisplayValue('50,000');
    const selectSpy = vi.spyOn(input as HTMLInputElement, 'select');
    await user.click(input);
    expect(selectSpy).toHaveBeenCalled();
  });

  it('주류 단가 input focus 시 select 호출', async () => {
    const user = userEvent.setup();
    setupMembers();
    const session = createSession({
      totalAmount: 90000,
      alcohol: { unitPrice: 5000, quantity: 3, drinkerIds: [] },
    });
    renderCard(session);

    const input = screen.getByDisplayValue('5,000');
    const selectSpy = vi.spyOn(input as HTMLInputElement, 'select');
    await user.click(input);
    expect(selectSpy).toHaveBeenCalled();
  });

  it('수량 input focus 시 select 호출', async () => {
    const user = userEvent.setup();
    setupMembers();
    const session = createSession({
      totalAmount: 90000,
      alcohol: { unitPrice: 5000, quantity: 3, drinkerIds: [] },
    });
    renderCard(session);

    const input = screen.getByDisplayValue('3');
    const selectSpy = vi.spyOn(input as HTMLInputElement, 'select');
    await user.click(input);
    expect(selectSpy).toHaveBeenCalled();
  });
});

// ── Zero amount warning ─────────────────────────────

describe('SessionCard - 0원 세션 경고', () => {
  it('totalAmount가 0이면 경고 스타일 적용', () => {
    setupMembers();
    const session = createSession({ totalAmount: 0 });
    const { container } = renderCard(session);
    const card = container.querySelector('.ring-2');
    expect(card).toBeInTheDocument();
  });

  it('totalAmount가 0이 아니면 경고 스타일 미적용', () => {
    setupMembers();
    const session = createSession({ totalAmount: 50000 });
    const { container } = renderCard(session);
    const card = container.querySelector('.ring-2');
    expect(card).not.toBeInTheDocument();
  });
});
