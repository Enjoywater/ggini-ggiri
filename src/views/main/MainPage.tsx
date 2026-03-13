'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Card, Chip, Modal } from '@/shared/ui';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useAccountStore } from '@/entities/account';
import { usePresetStore } from '@/entities/preset';
import type { MemberPreset } from '@/shared/types';
import { useHydration } from '@/shared/lib/use-hydration';
import { SessionCard } from '@/widgets/session-card';
import Link from 'next/link';

const PASTEL_COLORS = ['pink', 'lavender', 'mint', 'sky', 'peach'] as const;

export function MainPage() {
  const hydrated = useHydration();
  const { members, addMember, removeMember } = useMemberStore();
  const { sessions, addSession, removeSession, duplicateSession, removeMemberFromSessions } = useSessionStore();
  const account = useAccountStore((s) => s.account);

  // 계좌 예금주가 참여자에 없으면 자동 추가
  useEffect(() => {
    if (!hydrated || !account?.ownerName) return;
    const ownerExists = useMemberStore.getState().members.some(
      (m) => m.name === account.ownerName,
    );
    if (!ownerExists) {
      addMember(account.ownerName);
    }
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const { presets, addPreset, removePreset } = usePresetStore();

  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Preset modal states
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showLoadPresetModal, setShowLoadPresetModal] = useState(false);
  const [pendingLoadPreset, setPendingLoadPreset] = useState<MemberPreset | null>(null);
  const [showDeletePresetModal, setShowDeletePresetModal] = useState(false);
  const [pendingDeletePresetId, setPendingDeletePresetId] = useState<string | null>(null);

  const handleAddMember = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (members.some((m) => m.name === trimmed)) {
      setNameError('이미 같은 이름의 참여자가 있습니다.');
      return;
    }
    setNameError(null);
    addMember(trimmed);
    setNewName('');
  };

  const handleNameChange = (value: string) => {
    setNewName(value);
    if (nameError) setNameError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMember();
    }
  };

  const handleRemoveMember = (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (pendingDeleteId) {
      removeMemberFromSessions(pendingDeleteId);
      removeMember(pendingDeleteId);
      setPendingDeleteId(null);
    }
    setShowDeleteModal(false);
  };

  // Preset handlers
  const handleOpenSavePreset = () => {
    setPresetName(members.map((m) => m.name).join(', '));
    setShowSavePresetModal(true);
  };

  const handleSavePreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    addPreset(trimmed, members.map((m) => m.name));
    setShowSavePresetModal(false);
    setPresetName('');
  };

  const handleLoadPreset = (preset: MemberPreset) => {
    setPendingLoadPreset(preset);
    setShowLoadPresetModal(true);
  };

  const confirmLoadPreset = () => {
    if (!pendingLoadPreset) return;
    useMemberStore.getState().reset();
    useSessionStore.getState().reset();
    for (const name of pendingLoadPreset.memberNames) {
      useMemberStore.getState().addMember(name);
    }
    setPendingLoadPreset(null);
    setShowLoadPresetModal(false);
  };

  const handleDeletePreset = (id: string) => {
    setPendingDeletePresetId(id);
    setShowDeletePresetModal(true);
  };

  const confirmDeletePreset = () => {
    if (pendingDeletePresetId) {
      removePreset(pendingDeletePresetId);
      setPendingDeletePresetId(null);
    }
    setShowDeletePresetModal(false);
  };

  const handleAddSession = () => {
    if (members.length === 0) return;
    addSession({
      title: `${sessions.length + 1}차`,
      totalAmount: 0,
      payerId: members[0].id,
      participantIds: members.map((m) => m.id),
    });
  };

  const canCalculate = sessions.length > 0 && members.length >= 2;
  const hasZeroAmountSession = sessions.some((s) => s.totalAmount === 0);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">끼니끼리</h1>
          <p className="text-sm text-text-secondary">N차 정산, 간편하게</p>
        </div>
        <div className="flex gap-1">
          <Link href="/history" aria-label="정산 기록">
            <Button variant="ghost" size="sm">
              기록
            </Button>
          </Link>
          <Link href="/settings" aria-label="설정">
            <Button variant="ghost" size="sm">
              설정
            </Button>
          </Link>
        </div>
      </div>

      {/* Member Section */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          참여자
        </h2>

        <div className="flex flex-col gap-1 mb-3">
          <div className="flex gap-2">
            <Input
              placeholder="이름 입력"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="참여자 이름 입력"
            />
            <Button
              onClick={handleAddMember}
              disabled={!newName.trim()}
              size="md"
              aria-label="참여자 추가"
            >
              추가
            </Button>
          </div>
          {nameError && (
            <p className="text-xs text-danger-dark">{nameError}</p>
          )}
        </div>

        {members.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {members.map((member, i) => (
              <Chip
                key={member.id}
                selected
                color={PASTEL_COLORS[i % PASTEL_COLORS.length]}
                onClick={() => handleRemoveMember(member.id)}
                aria-label={`${member.name} 삭제`}
              >
                {member.name} &times;
              </Chip>
            ))}
          </div>
        )}

        {members.length === 0 && (
          <p className="text-sm text-text-muted text-center py-4">
            모임 참여자를 추가해 주세요
          </p>
        )}
      </Card>

      {/* Preset Section */}
      {(presets.length > 0 || members.length >= 2) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-secondary">
              저장된 그룹
            </h3>
            {members.length >= 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenSavePreset}
                aria-label="현재 그룹 저장"
              >
                현재 그룹 저장
              </Button>
            )}
          </div>

          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Chip
                  key={preset.id}
                  color="lavender"
                  selected
                  onClick={() => handleLoadPreset(preset)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleDeletePreset(preset.id);
                  }}
                  aria-label={`${preset.name} 불러오기`}
                >
                  {preset.name} ({preset.memberNames.length}명)
                </Chip>
              ))}
            </div>
          )}

          {presets.length === 0 && (
            <p className="text-xs text-text-muted">
              현재 참여자 그룹을 저장하면 다음에 빠르게 불러올 수 있습니다.
            </p>
          )}
        </div>
      )}

      {/* Sessions Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">N차 내역</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddSession}
            disabled={members.length === 0}
            aria-label="세션 추가"
          >
            + 추가
          </Button>
        </div>

        {sessions.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-text-muted">
              {members.length === 0
                ? '먼저 참여자를 추가해 주세요'
                : '+ 추가 버튼으로 N차를 추가하세요'}
            </p>
          </Card>
        )}

        {sessions.map((session, i) => (
          <SessionCard
            key={session.id}
            session={session}
            index={i}
            onRemove={removeSession}
            onDuplicate={duplicateSession}
          />
        ))}
      </div>

      {/* Calculate Button */}
      {sessions.length > 0 && (
        <div className="flex flex-col gap-2">
          {hasZeroAmountSession && (
            <p className="text-xs text-warning-dark text-center">
              금액이 0원인 세션이 있습니다. 정산 결과에 반영되지 않을 수 있습니다.
            </p>
          )}
          <Link href="/settlement" className="block">
            <Button fullWidth size="lg" disabled={!canCalculate}>
              정산하기
            </Button>
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="참여자 삭제"
      >
        <p className="mb-4 text-text-secondary">
          해당 참여자를 삭제하시겠습니까?
          <br />
          세션에서도 함께 제거됩니다.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowDeleteModal(false)}
          >
            취소
          </Button>
          <Button variant="danger" fullWidth onClick={confirmDelete}>
            삭제
          </Button>
        </div>
      </Modal>

      {/* Save Preset Modal */}
      <Modal
        open={showSavePresetModal}
        onClose={() => setShowSavePresetModal(false)}
        title="그룹 저장"
      >
        <p className="mb-3 text-sm text-text-secondary">
          현재 참여자 그룹의 이름을 입력해 주세요.
        </p>
        <Input
          placeholder="그룹 이름"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSavePreset();
            }
          }}
          aria-label="프리셋 이름 입력"
        />
        <div className="flex gap-2 mt-4">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowSavePresetModal(false)}
          >
            취소
          </Button>
          <Button
            fullWidth
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
          >
            저장
          </Button>
        </div>
      </Modal>

      {/* Load Preset Confirmation Modal */}
      <Modal
        open={showLoadPresetModal}
        onClose={() => setShowLoadPresetModal(false)}
        title="그룹 불러오기"
      >
        <p className="mb-4 text-text-secondary">
          &lsquo;{pendingLoadPreset?.name}&rsquo; 그룹을 불러오시겠습니까?
          <br />
          현재 참여자 목록이 교체됩니다.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowLoadPresetModal(false)}
          >
            취소
          </Button>
          <Button fullWidth onClick={confirmLoadPreset}>
            불러오기
          </Button>
        </div>
      </Modal>

      {/* Delete Preset Confirmation Modal */}
      <Modal
        open={showDeletePresetModal}
        onClose={() => setShowDeletePresetModal(false)}
        title="그룹 삭제"
      >
        <p className="mb-4 text-text-secondary">
          저장된 그룹을 삭제하시겠습니까?
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowDeletePresetModal(false)}
          >
            취소
          </Button>
          <Button variant="danger" fullWidth onClick={confirmDeletePreset}>
            삭제
          </Button>
        </div>
      </Modal>
    </div>
  );
}
