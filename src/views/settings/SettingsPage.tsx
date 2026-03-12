'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Card, CardTitle, Modal, Chip } from '@/shared/ui';
import { useAccountStore } from '@/entities/account';
import { useThemeStore, type ThemeMode } from '@/entities/theme';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useHydration } from '@/shared/lib/use-hydration';
import Link from 'next/link';

export function SettingsPage() {
  const hydrated = useHydration();
  const { account, setAccount, clearAccount } = useAccountStore();
  const members = useMemberStore((s) => s.members);
  const resetMembers = useMemberStore((s) => s.reset);
  const resetSessions = useSessionStore((s) => s.reset);

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleSave = () => {
    if (!bankName.trim() || !accountNumber.trim() || !ownerName.trim()) return;
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
          <Input
            label="은행명"
            placeholder="예: 카카오뱅크"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
          <Input
            label="계좌번호"
            placeholder="계좌번호 입력"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          <Input
            label="예금주"
            placeholder="예금주명"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
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

      {/* Reset Confirmation */}
      <Modal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="데이터 초기화"
      >
        <p className="mb-4 text-text-secondary">
          모든 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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
