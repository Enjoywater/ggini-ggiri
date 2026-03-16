'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Card, CardTitle, Modal, Chip } from '@/shared/ui';
import { useAccountStore } from '@/entities/account';
import { useThemeStore, type ThemeMode } from '@/entities/theme';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useHistoryStore } from '@/entities/history';
import { usePresetStore } from '@/entities/preset';
import { useTransferCompletionStore } from '@/entities/transfer-completion';
import { validateAccountNumber, validateBankName, validateOwnerName } from '@/shared/lib/validators';
import { useHydration } from '@/shared/lib/use-hydration';
import { ExportImportButtons } from '@/features/export-import';
import Link from 'next/link';

export function SettingsPage() {
  const hydrated = useHydration();
  const { account, setAccount, clearAccount } = useAccountStore();
  const members = useMemberStore((s) => s.members);
  const resetMembers = useMemberStore((s) => s.reset);
  const resetSessions = useSessionStore((s) => s.reset);
  const clearHistory = useHistoryStore((s) => s.clearAll);
  const resetPresets = usePresetStore((s) => s.reset);
  const resetTransferCompletion = useTransferCompletionStore((s) => s.reset);

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [saved, setSaved] = useState(false);

  const [bankNameError, setBankNameError] = useState<string | null>(null);
  const [accountNumberError, setAccountNumberError] = useState<string | null>(null);
  const [ownerNameError, setOwnerNameError] = useState<string | null>(null);

  // hydration 후 저장된 계좌 정보로 초기값 복원
  useEffect(() => {
    if (!hydrated) return;
    setBankName(account?.bankName ?? '');
    setAccountNumber(account?.accountNumber ?? '');
    // 계좌가 이미 설정된 경우에만 예금주를 멤버 이름으로 기본값 설정
    if (account?.accountNumber) {
      setOwnerName(account.ownerName || members[0]?.name || '');
    }
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBankNameBlur = () => {
    if (!bankName.trim()) { setBankNameError(null); return; }
    const result = validateBankName(bankName);
    setBankNameError(result.valid ? null : result.error ?? null);
  };

  const handleAccountNumberBlur = () => {
    if (!accountNumber.trim()) { setAccountNumberError(null); return; }
    const result = validateAccountNumber(accountNumber);
    setAccountNumberError(result.valid ? null : result.error ?? null);
  };

  const handleOwnerNameBlur = () => {
    if (!ownerName.trim()) { setOwnerNameError(null); return; }
    const result = validateOwnerName(ownerName);
    setOwnerNameError(result.valid ? null : result.error ?? null);
  };

  const handleSave = () => {
    const bankResult = validateBankName(bankName);
    const accountResult = validateAccountNumber(accountNumber);
    const ownerResult = validateOwnerName(ownerName);

    setBankNameError(bankResult.valid ? null : bankResult.error ?? null);
    setAccountNumberError(accountResult.valid ? null : accountResult.error ?? null);
    setOwnerNameError(ownerResult.valid ? null : ownerResult.error ?? null);

    if (!bankResult.valid || !accountResult.valid || !ownerResult.valid) return;

    setAccount({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ownerName: ownerName.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetMembers();
    resetSessions();
    clearAccount();
    clearHistory();
    resetPresets();
    resetTransferCompletion();
    setShowResetModal(false);
    setBankName('');
    setAccountNumber('');
    setOwnerName('');
  };

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-text-muted">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="뒤로 가기">
          <Button variant="ghost" size="sm">
            &larr;
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-text-primary">설정</h1>
      </div>

      {/* Theme Section */}
      <ThemeToggle />

      {/* Account Section */}
      <Card>
        <CardTitle className="mb-4">계좌 정보</CardTitle>
        <p className="mb-4 text-sm text-text-secondary">
          정산 결과에서 계좌 복사 기능에 사용됩니다.
          <br />
          계좌 정보는 기기에만 저장되며 URL에 포함되지 않습니다.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <Input
              label="은행명"
              placeholder="예: 카카오뱅크"
              value={bankName}
              onChange={(e) => { setBankName(e.target.value); setBankNameError(null); }}
              onBlur={handleBankNameBlur}
            />
            {bankNameError && <p className="text-xs text-danger-dark mt-1">{bankNameError}</p>}
          </div>
          <div>
            <Input
              label="계좌번호"
              placeholder="계좌번호 입력"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => { setAccountNumber(e.target.value); setAccountNumberError(null); }}
              onBlur={handleAccountNumberBlur}
            />
            {accountNumberError && <p className="text-xs text-danger-dark mt-1">{accountNumberError}</p>}
          </div>
          <div>
            <Input
              label="예금주"
              placeholder="예금주명"
              value={ownerName}
              onChange={(e) => { setOwnerName(e.target.value); setOwnerNameError(null); }}
              onBlur={handleOwnerNameBlur}
            />
            {ownerNameError && <p className="text-xs text-danger-dark mt-1">{ownerNameError}</p>}
          </div>
          <Button fullWidth onClick={handleSave}>
            {saved ? '저장 완료!' : '계좌 저장'}
          </Button>
        </div>
      </Card>

      {/* Data Reset */}
      <Card>
        <CardTitle className="mb-3">데이터 관리</CardTitle>
        <p className="mb-3 text-sm text-text-secondary">
          모든 참여자, 세션, 계좌 정보를 초기화합니다.
        </p>
        <Button
          variant="danger"
          fullWidth
          onClick={() => setShowResetModal(true)}
        >
          전체 데이터 초기화
        </Button>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardTitle className="mb-3">백업 및 복원</CardTitle>
        <p className="mb-3 text-sm text-text-secondary">
          정산 기록을 JSON 파일로 내보내거나, 이전에 내보낸 파일을 가져올 수 있습니다.
        </p>
        <ExportImportButtons />
      </Card>

      {/* Reset Confirmation */}
      <Modal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="데이터 초기화"
      >
        <p className="mb-4 text-text-secondary">
          모든 데이터가 삭제됩니다. 정산 기록, 저장된 그룹도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowResetModal(false)}
          >
            취소
          </Button>
          <Button variant="danger" fullWidth onClick={handleReset}>
            초기화
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
  { value: 'system', label: '시스템' },
];

function ThemeToggle() {
  const { mode, setMode } = useThemeStore();

  return (
    <Card>
      <CardTitle className="mb-3">화면 설정</CardTitle>
      <div className="flex gap-2">
        {themeOptions.map((opt) => (
          <Chip
            key={opt.value}
            selected={mode === opt.value}
            color="sky"
            onClick={() => setMode(opt.value)}
          >
            {opt.label}
          </Chip>
        ))}
      </div>
    </Card>
  );
}
