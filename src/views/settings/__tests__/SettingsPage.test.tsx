import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from '../SettingsPage';
import { useAccountStore } from '@/entities/account';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useHistoryStore } from '@/entities/history';
import { usePresetStore } from '@/entities/preset';
import { useTransferCompletionStore } from '@/entities/transfer-completion';
import { useThemeStore } from '@/entities/theme';

// ── Mocks ────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/shared/lib/use-hydration', () => ({
  useHydration: () => true,
}));

vi.mock('@/features/export-import', () => ({
  ExportImportButtons: () => <div data-testid="export-import">Export/Import</div>,
}));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  useAccountStore.getState().clearAccount();
  useMemberStore.getState().reset();
  useSessionStore.getState().reset();
  useHistoryStore.getState().clearAll();
  usePresetStore.getState().reset();
  useTransferCompletionStore.getState().reset();
  useThemeStore.setState({ mode: 'system' });
});

// ── Header ───────────────────────────────────────────

describe('SettingsPage - 헤더', () => {
  it('설정 제목 표시', () => {
    render(<SettingsPage />);
    expect(screen.getByText('설정')).toBeInTheDocument();
  });

  it('뒤로 가기 링크', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText('뒤로 가기').closest('a')).toHaveAttribute('href', '/');
  });
});

// ── Theme toggle ─────────────────────────────────────

describe('SettingsPage - 테마 설정', () => {
  it('라이트/다크/시스템 옵션 렌더링', () => {
    render(<SettingsPage />);
    expect(screen.getByText('라이트')).toBeInTheDocument();
    expect(screen.getByText('다크')).toBeInTheDocument();
    expect(screen.getByText('시스템')).toBeInTheDocument();
  });

  it('테마 변경 시 스토어 업데이트', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByText('다크'));
    expect(useThemeStore.getState().mode).toBe('dark');

    await user.click(screen.getByText('라이트'));
    expect(useThemeStore.getState().mode).toBe('light');
  });
});

// ── Account CRUD ─────────────────────────────────────

describe('SettingsPage - 계좌 정보', () => {
  it('계좌 입력 필드 렌더링', () => {
    render(<SettingsPage />);
    expect(screen.getByPlaceholderText('예: 카카오뱅크')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('계좌번호 입력')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('예금주명')).toBeInTheDocument();
  });

  it('계좌 저장 성공', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.type(screen.getByPlaceholderText('예: 카카오뱅크'), '카카오뱅크');
    await user.type(screen.getByPlaceholderText('계좌번호 입력'), '1234567890');
    await user.type(screen.getByPlaceholderText('예금주명'), '홍길동');
    await user.click(screen.getByText('계좌 저장'));

    const account = useAccountStore.getState().account;
    expect(account).toEqual({
      bankName: '카카오뱅크',
      accountNumber: '1234567890',
      ownerName: '홍길동',
    });
  });

  it('저장 성공 시 피드백 메시지', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.type(screen.getByPlaceholderText('예: 카카오뱅크'), '카카오뱅크');
    await user.type(screen.getByPlaceholderText('계좌번호 입력'), '1234567890');
    await user.type(screen.getByPlaceholderText('예금주명'), '홍길동');
    await user.click(screen.getByText('계좌 저장'));

    expect(screen.getByText('저장 완료!')).toBeInTheDocument();
  });

  it('유효하지 않은 계좌번호 에러', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.type(screen.getByPlaceholderText('예: 카카오뱅크'), '카카오뱅크');
    await user.type(screen.getByPlaceholderText('계좌번호 입력'), 'abc');
    await user.type(screen.getByPlaceholderText('예금주명'), '홍길동');
    await user.click(screen.getByText('계좌 저장'));

    expect(useAccountStore.getState().account).toBeNull();
  });

  it('기존 계좌 정보가 입력 필드에 복원됨', () => {
    useAccountStore.getState().setAccount({
      bankName: '신한은행',
      accountNumber: '9876543210',
      ownerName: '김철수',
    });
    render(<SettingsPage />);

    expect(screen.getByPlaceholderText('예: 카카오뱅크')).toHaveValue('신한은행');
    expect(screen.getByPlaceholderText('계좌번호 입력')).toHaveValue('9876543210');
    expect(screen.getByPlaceholderText('예금주명')).toHaveValue('김철수');
  });

  it('보안 안내 메시지 표시', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/기기에만 저장/)).toBeInTheDocument();
    expect(screen.getByText(/URL에 포함되지 않습니다/)).toBeInTheDocument();
  });
});

// ── Data Reset ───────────────────────────────────────

describe('SettingsPage - 전체 초기화', () => {
  it('초기화 버튼 클릭 시 확인 모달', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByText('전체 데이터 초기화'));
    expect(screen.getByText('데이터 초기화')).toBeInTheDocument();
    expect(screen.getByText(/되돌릴 수 없습니다/)).toBeInTheDocument();
  });

  it('초기화 확인 시 모든 데이터 삭제', async () => {
    const user = userEvent.setup();
    // 데이터 채워넣기
    useMemberStore.getState().addMember('앨리스');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a',
      participantIds: ['a'],
    });
    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '1234567890',
      ownerName: '앨리스',
    });
    usePresetStore.getState().addPreset('테스트', ['앨리스']);

    render(<SettingsPage />);

    await user.click(screen.getByText('전체 데이터 초기화'));
    const confirmBtn = screen.getByRole('button', { name: '초기화', hidden: true });
    await user.click(confirmBtn);

    expect(useMemberStore.getState().members).toHaveLength(0);
    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useAccountStore.getState().account).toBeNull();
    expect(usePresetStore.getState().presets).toHaveLength(0);
  });

  it('초기화 취소 시 데이터 유지', async () => {
    const user = userEvent.setup();
    useMemberStore.getState().addMember('앨리스');
    render(<SettingsPage />);

    await user.click(screen.getByText('전체 데이터 초기화'));
    const cancelBtn = screen.getByRole('button', { name: '취소', hidden: true });
    await user.click(cancelBtn);

    expect(useMemberStore.getState().members).toHaveLength(1);
  });
});

// ── Backup & Restore ─────────────────────────────────

describe('SettingsPage - 백업/복원', () => {
  it('백업/복원 섹션 렌더링', () => {
    render(<SettingsPage />);
    expect(screen.getByText('백업 및 복원')).toBeInTheDocument();
    expect(screen.getByTestId('export-import')).toBeInTheDocument();
  });
});
