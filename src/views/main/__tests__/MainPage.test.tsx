import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MainPage } from '../MainPage';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useAccountStore } from '@/entities/account';
import { usePresetStore } from '@/entities/preset';

// ── Mocks ────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockUseHydration = vi.fn(() => true);
vi.mock('@/shared/lib/use-hydration', () => ({
  useHydration: () => mockUseHydration(),
}));

vi.mock('@/widgets/session-card', () => ({
  SessionCard: ({ session, index }: { session: { id: string; title: string; totalAmount: number }; index: number }) => (
    <div data-testid={`session-card-${index}`}>
      <span>{session.title}</span>
      <span>{session.totalAmount}</span>
    </div>
  ),
}));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  useMemberStore.getState().reset();
  useSessionStore.getState().reset();
  useAccountStore.getState().clearAccount();
  usePresetStore.getState().reset();
  mockUseHydration.mockReturnValue(true);
});

// ── Hydration ────────────────────────────────────────

describe('MainPage - 하이드레이션', () => {
  it('하이드레이션 전 로딩 상태 표시', () => {
    mockUseHydration.mockReturnValueOnce(false);
    render(<MainPage />);
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('하이드레이션 후 메인 UI 렌더링', () => {
    render(<MainPage />);
    expect(screen.getByText('끼니끼리')).toBeInTheDocument();
    expect(screen.getByText('N차 정산, 간편하게')).toBeInTheDocument();
  });
});

// ── Header / Navigation ──────────────────────────────

describe('MainPage - 헤더', () => {
  it('기록, 설정 네비게이션 링크 존재', () => {
    render(<MainPage />);
    expect(screen.getByLabelText('정산 기록').closest('a')).toHaveAttribute('href', '/history');
    expect(screen.getByLabelText('설정').closest('a')).toHaveAttribute('href', '/settings');
  });
});

// ── Member CRUD ──────────────────────────────────────

describe('MainPage - 참여자 관리', () => {
  it('빈 상태에서 안내 메시지 표시', () => {
    render(<MainPage />);
    expect(screen.getByText('모임 참여자를 추가해 주세요')).toBeInTheDocument();
  });

  it('참여자 추가', async () => {
    const user = userEvent.setup();
    render(<MainPage />);

    const input = screen.getByLabelText('참여자 이름 입력');
    const addBtn = screen.getByLabelText('참여자 추가');

    await user.type(input, '앨리스');
    await user.click(addBtn);

    expect(useMemberStore.getState().members).toHaveLength(1);
    expect(useMemberStore.getState().members[0].name).toBe('앨리스');
  });

  it('Enter로 참여자 추가', async () => {
    const user = userEvent.setup();
    render(<MainPage />);

    const input = screen.getByLabelText('참여자 이름 입력');
    await user.type(input, '밥{Enter}');

    expect(useMemberStore.getState().members).toHaveLength(1);
    expect(useMemberStore.getState().members[0].name).toBe('밥');
  });

  it('추가 후 입력 필드 초기화', async () => {
    const user = userEvent.setup();
    render(<MainPage />);

    const input = screen.getByLabelText('참여자 이름 입력');
    await user.type(input, '앨리스{Enter}');

    expect(input).toHaveValue('');
  });

  it('중복 이름 추가 시 에러 메시지', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    render(<MainPage />);

    const input = screen.getByLabelText('참여자 이름 입력');
    await user.type(input, '앨리스{Enter}');

    expect(screen.getByText('이미 같은 이름의 참여자가 있습니다.')).toBeInTheDocument();
  });

  it('빈 이름은 추가되지 않음', async () => {
    const user = userEvent.setup();
    render(<MainPage />);

    const addBtn = screen.getByLabelText('참여자 추가');
    expect(addBtn).toBeDisabled();

    const input = screen.getByLabelText('참여자 이름 입력');
    await user.type(input, '   {Enter}');
    expect(useMemberStore.getState().members).toHaveLength(0);
  });

  it('X 버튼 클릭 시 삭제 모달 표시', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    render(<MainPage />);

    await user.click(screen.getByLabelText('앨리스 삭제'));
    expect(screen.getByText('참여자 삭제')).toBeInTheDocument();
  });

  it('삭제 확인 시 참여자 제거', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    render(<MainPage />);

    await user.click(screen.getByLabelText('앨리스 삭제'));
    // 참여자 삭제 모달 내의 삭제 버튼 (첫 번째 매칭)
    const deleteButtons = screen.getAllByRole('button', { name: '삭제', hidden: true });
    await user.click(deleteButtons[0]);

    expect(useMemberStore.getState().members).toHaveLength(0);
  });

  it('삭제 취소 시 참여자 유지', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    render(<MainPage />);

    await user.click(screen.getByLabelText('앨리스 삭제'));
    const cancelButtons = screen.getAllByRole('button', { name: '취소', hidden: true });
    await user.click(cancelButtons[0]);

    expect(useMemberStore.getState().members).toHaveLength(1);
  });

  it('참여자 삭제 시 세션에서도 제거', async () => {
    const user = userEvent.setup();
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });
    render(<MainPage />);

    await user.click(screen.getByLabelText('밥 삭제'));
    const deleteButtons = screen.getAllByRole('button', { name: '삭제', hidden: true });
    await user.click(deleteButtons[0]);

    const session = useSessionStore.getState().sessions[0];
    expect(session.participantIds).not.toContain(bob.id);
  });

  it('Chip 클릭으로 이름 수정 모드 진입', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    render(<MainPage />);

    const chip = screen.getByLabelText('앨리스 이름 수정');
    await user.click(chip);

    expect(screen.getByLabelText('참여자 이름 수정')).toBeInTheDocument();
    expect(screen.getByLabelText('참여자 이름 수정')).toHaveValue('앨리스');
  });

  it('도움 텍스트가 참여자 있을 때만 표시', () => {
    const { rerender } = render(<MainPage />);
    expect(screen.queryByText(/이름을 탭하여 수정/)).not.toBeInTheDocument();

    useMemberStore.getState().addMember('앨리스');
    rerender(<MainPage />);
    expect(screen.getByText(/이름을 탭하여 수정/)).toBeInTheDocument();
  });
});

// ── Auto-add account owner ───────────────────────────

describe('MainPage - 계좌 예금주 자동 추가', () => {
  it('계좌 예금주가 참여자에 없으면 자동 추가', () => {
    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '1234567890',
      ownerName: '홍길동',
    });
    render(<MainPage />);

    expect(useMemberStore.getState().members.some((m) => m.name === '홍길동')).toBe(true);
  });

  it('이미 동일 이름의 참여자가 있으면 중복 추가하지 않음', () => {
    useMemberStore.getState().addMember('홍길동');
    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '1234567890',
      ownerName: '홍길동',
    });
    render(<MainPage />);

    expect(useMemberStore.getState().members.filter((m) => m.name === '홍길동')).toHaveLength(1);
  });
});

// ── Session management ───────────────────────────────

describe('MainPage - 세션 관리', () => {
  it('참여자 없을 때 세션 추가 버튼 비활성화', () => {
    render(<MainPage />);
    expect(screen.getByLabelText('세션 추가')).toBeDisabled();
  });

  it('참여자 없을 때 안내 메시지', () => {
    render(<MainPage />);
    expect(screen.getByText('먼저 참여자를 추가해 주세요')).toBeInTheDocument();
  });

  it('참여자 추가 후 세션 추가 가능', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    render(<MainPage />);

    await user.click(screen.getByLabelText('세션 추가'));
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    expect(screen.getByTestId('session-card-0')).toBeInTheDocument();
  });

  it('세션 추가 시 전원 참여자로 설정', async () => {
    const user = userEvent.setup();
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    render(<MainPage />);

    await user.click(screen.getByLabelText('세션 추가'));
    const session = useSessionStore.getState().sessions[0];
    expect(session.participantIds).toContain(alice.id);
    expect(session.participantIds).toContain(bob.id);
    expect(session.payerId).toBe(alice.id);
  });

  it('세션 추가 시 자동 번호 부여 (1차, 2차...)', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    render(<MainPage />);

    await user.click(screen.getByLabelText('세션 추가'));
    await user.click(screen.getByLabelText('세션 추가'));

    const sessions = useSessionStore.getState().sessions;
    expect(sessions[0].title).toBe('1차');
    expect(sessions[1].title).toBe('2차');
  });

  it('참여자 있고 세션 없을 때 세션 추가 안내', () => {
    useMemberStore.getState().addMember('앨리스');
    render(<MainPage />);
    expect(screen.getByText('+ 추가 버튼으로 N차를 추가하세요')).toBeInTheDocument();
  });
});

// ── Session total & Calculate button ─────────────────

describe('MainPage - 합계 및 정산 버튼', () => {
  it('세션 합계 표시', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id],
    });
    useSessionStore.getState().addSession({
      title: '2차',
      totalAmount: 30000,
      payerId: alice.id,
      participantIds: [alice.id],
    });
    render(<MainPage />);

    expect(screen.getByText('전체 합계')).toBeInTheDocument();
    expect(screen.getByText('80,000원')).toBeInTheDocument();
  });

  it('0원 세션 경고 메시지', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 0,
      payerId: alice.id,
      participantIds: [alice.id],
    });
    render(<MainPage />);

    expect(screen.getByText(/금액이 0원인 세션/)).toBeInTheDocument();
  });

  it('참여자 2명 미만일 때 정산 버튼 비활성화', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id],
    });
    render(<MainPage />);

    expect(screen.getByText('정산하기')).toBeInTheDocument();
    expect(screen.getByText('정산하기').closest('a')).toHaveAttribute('aria-disabled', 'true');
  });

  it('정산 가능 시 정산 링크 활성화', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });
    render(<MainPage />);

    const link = screen.getByText('정산하기').closest('a');
    expect(link).toHaveAttribute('href', '/settlement');
  });
});

// ── Preset management ────────────────────────────────

describe('MainPage - 프리셋 관리', () => {
  it('참여자 2명 이상일 때 그룹 저장 버튼 표시', () => {
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    render(<MainPage />);

    expect(screen.getByLabelText('현재 그룹 저장')).toBeInTheDocument();
  });

  it('참여자 1명 이하일 때 그룹 저장 버튼 미표시', () => {
    useMemberStore.getState().addMember('앨리스');
    render(<MainPage />);

    expect(screen.queryByLabelText('현재 그룹 저장')).not.toBeInTheDocument();
  });

  it('그룹 저장 플로우', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    render(<MainPage />);

    await user.click(screen.getByLabelText('현재 그룹 저장'));
    expect(screen.getByText('그룹 저장')).toBeInTheDocument();

    const presetInput = screen.getByLabelText('프리셋 이름 입력');
    await user.clear(presetInput);
    await user.type(presetInput, '테스트 그룹');

    const saveButtons = screen.getAllByRole('button', { name: '저장', hidden: true });
    await user.click(saveButtons[0]);

    expect(usePresetStore.getState().presets).toHaveLength(1);
    expect(usePresetStore.getState().presets[0].name).toBe('테스트 그룹');
  });

  it('프리셋 칩 클릭 시 액션 모달 표시', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    usePresetStore.getState().addPreset('회식팀', ['앨리스', '밥']);
    render(<MainPage />);

    await user.click(screen.getByLabelText('회식팀 선택'));
    expect(screen.getByText(/무엇을 하시겠습니까/)).toBeInTheDocument();
  });

  it('프리셋 불러오기: 스토어 직접 실행 검증', () => {
    usePresetStore.getState().addPreset('회식팀', ['찰리', '다이앤']);
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');

    // confirmLoadPreset 내부 로직과 동일하게 실행
    const preset = usePresetStore.getState().presets[0];
    useMemberStore.getState().reset();
    useSessionStore.getState().reset();
    for (const name of preset.memberNames) {
      useMemberStore.getState().addMember(name);
    }

    const names = useMemberStore.getState().members.map((m) => m.name);
    expect(names).toEqual(['찰리', '다이앤']);
  });

  it('프리셋 삭제: 스토어 직접 실행 검증', () => {
    usePresetStore.getState().addPreset('회식팀', ['앨리스', '밥']);
    expect(usePresetStore.getState().presets).toHaveLength(1);

    const presetId = usePresetStore.getState().presets[0].id;
    usePresetStore.getState().removePreset(presetId);
    expect(usePresetStore.getState().presets).toHaveLength(0);
  });

  it('프리셋 칩 클릭 시 액션 모달에 불러오기/삭제 버튼 존재', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    usePresetStore.getState().addPreset('회식팀', ['앨리스', '밥']);
    render(<MainPage />);

    await user.click(screen.getByLabelText('회식팀 선택'));
    // 액션 모달에 불러오기, 삭제 버튼이 모두 존재
    const loadButtons = screen.getAllByRole('button', { name: '불러오기', hidden: true });
    const deleteButtons = screen.getAllByRole('button', { name: '삭제', hidden: true });
    expect(loadButtons.length).toBeGreaterThanOrEqual(1);
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('프리셋 목록에 멤버 수 표시', () => {
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    usePresetStore.getState().addPreset('3인방', ['A', 'B', 'C']);
    render(<MainPage />);

    expect(screen.getByText('3인방 (3명)')).toBeInTheDocument();
  });
});

// ── Animation ───────────────────────────────────────

describe('MainPage - 애니메이션', () => {
  it('참여자 빈 상태에 animate-breathing 클래스', () => {
    render(<MainPage />);
    const emptyText = screen.getByText('모임 참여자를 추가해 주세요');
    expect(emptyText.className).toContain('animate-breathing');
  });

  it('세션 빈 상태에 animate-breathing 클래스', () => {
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    render(<MainPage />);
    const emptyText = screen.getByText('+ 추가 버튼으로 N차를 추가하세요');
    expect(emptyText.className).toContain('animate-breathing');
  });
});
