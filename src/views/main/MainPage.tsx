'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, LinkButton, Input, Card, Chip, Modal, StickyBottomBar, MainPageSkeleton, EmptyState } from '@/shared/ui';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useAccountStore } from '@/entities/account';
import { usePresetStore } from '@/entities/preset';
import type { MemberPreset } from '@/shared/types';
import { useHydration } from '@/shared/lib/use-hydration';
import { PASTEL_COLORS } from '@/shared/lib';
import { useModalManager } from '@/shared/lib/use-modal-manager';
import { formatAmount } from '@/shared/lib/formatters';
import { SessionCard } from '@/widgets/session-card';
import { useNewItemIds } from '@/shared/lib/use-animate-list';
import { useOnboardingStore } from '@/entities/onboarding';
import { OnboardingTooltip, useOnboardingAutoProgress } from '@/features/inline-onboarding';

const MODAL_KEYS = ['delete', 'savePreset', 'loadPreset', 'deletePreset', 'deleteSession', 'presetAction'] as const;

export function MainPage() {
  const hydrated = useHydration();
  const { members, addMember, removeMember, updateMember } = useMemberStore();
  const { sessions, addSession, removeSession, duplicateSession, removeMemberFromSessions } = useSessionStore();
  const account = useAccountStore((s) => s.account);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || initializedRef.current) return;
    initializedRef.current = true;
    if (!account?.ownerName) return;
    const ownerExists = useMemberStore.getState().members.some(
      (m) => m.name === account.ownerName,
    );
    if (!ownerExists) {
      addMember(account.ownerName);
    }
  }, [hydrated, account, addMember]);

  const { presets, addPreset, removePreset } = usePresetStore();
  const modal = useModalManager(MODAL_KEYS);

  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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
    modal.open('delete', id);
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingMemberId(id);
    setEditingName(currentName);
  };

  const handleConfirmEdit = () => {
    if (!editingMemberId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingMemberId(null);
      return;
    }
    const duplicate = members.some((m) => m.id !== editingMemberId && m.name === trimmed);
    if (duplicate) {
      setNameError('이미 같은 이름의 참여자가 있습니다.');
      setEditingMemberId(null);
      return;
    }
    updateMember(editingMemberId, trimmed);
    setEditingMemberId(null);
    setNameError(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmEdit();
    }
    if (e.key === 'Escape') {
      setEditingMemberId(null);
    }
  };

  const confirmDelete = () => {
    const pendingDeleteId = modal.getData<string>('delete');
    if (pendingDeleteId) {
      removeMemberFromSessions(pendingDeleteId);
      removeMember(pendingDeleteId);
    }
    modal.close('delete');
  };

  const handleOpenSavePreset = () => {
    setPresetName(members.map((m) => m.name).join(', '));
    modal.open('savePreset');
  };

  const handleSavePreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    addPreset(trimmed, members.map((m) => m.name));
    modal.close('savePreset');
    setPresetName('');
  };

  const handleRemoveSession = (id: string) => {
    modal.open('deleteSession', id);
  };

  const confirmDeleteSession = () => {
    const pendingDeleteSessionId = modal.getData<string>('deleteSession');
    if (pendingDeleteSessionId) {
      removeSession(pendingDeleteSessionId);
    }
    modal.close('deleteSession');
  };

  const handlePresetClick = (preset: MemberPreset) => {
    modal.open('presetAction', preset);
  };

  const handleLoadPreset = (preset: MemberPreset) => {
    modal.open('loadPreset', preset);
  };

  const confirmLoadPreset = () => {
    const pendingLoadPreset = modal.getData<MemberPreset>('loadPreset');
    if (!pendingLoadPreset) return;
    useMemberStore.getState().reset();
    useSessionStore.getState().reset();
    for (const name of pendingLoadPreset.memberNames) {
      useMemberStore.getState().addMember(name);
    }
    modal.close('loadPreset');
  };

  const handleDeletePreset = (id: string) => {
    modal.open('deletePreset', id);
  };

  const confirmDeletePreset = () => {
    const pendingDeletePresetId = modal.getData<string>('deletePreset');
    if (pendingDeletePresetId) {
      removePreset(pendingDeletePresetId);
    }
    modal.close('deletePreset');
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

  const { currentStep, dismiss: dismissOnboarding } = useOnboardingStore();
  useOnboardingAutoProgress();

  const newMemberIds = useNewItemIds(members);
  const newSessionIds = useNewItemIds(sessions);

  const canCalculate = sessions.length > 0 && members.length >= 2;
  const hasZeroAmountSession = sessions.some((s) => s.totalAmount === 0);

  if (!hydrated) {
    return <MainPageSkeleton />;
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
          <LinkButton href="/history" aria-label="정산 기록" variant="ghost" size="sm">
            기록
          </LinkButton>
          <LinkButton href="/settings" aria-label="설정" variant="ghost" size="sm">
            설정
          </LinkButton>
        </div>
      </div>

      {/* Member Section */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          참여자
        </h2>

        <OnboardingTooltip step="add-member" currentStep={currentStep} message="먼저 참여자를 추가해 보세요!" onDismiss={dismissOnboarding}>
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
        </OnboardingTooltip>

        {members.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {members.map((member, i) =>
              editingMemberId === member.id ? (
                <input
                  key={member.id}
                  type="text"
                  className="rounded-full border border-primary px-3 py-1.5 text-sm font-medium outline-none bg-surface-elevated text-text-primary w-24"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleConfirmEdit}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  aria-label="참여자 이름 수정"
                />
              ) : (
                <div
                  key={member.id}
                  className={`inline-flex items-center ${newMemberIds.has(member.id) ? 'animate-spring-in' : ''}`}
                  style={newMemberIds.has(member.id) ? { animationDelay: `${i * 50}ms` } : undefined}
                >
                  <Chip
                    selected
                    color={PASTEL_COLORS[i % PASTEL_COLORS.length]}
                    onClick={() => handleStartEdit(member.id, member.name)}
                    role="button"
                    aria-label={`${member.name} 이름 수정`}
                  >
                    {member.name}
                  </Chip>
                  <button
                    type="button"
                    className="-ml-1 inline-flex items-center justify-center rounded-full p-1.5 -m-1 text-text-muted hover:text-danger-dark hover:bg-danger/10 transition-colors"
                    onClick={() => handleRemoveMember(member.id)}
                    aria-label={`${member.name} 삭제`}
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
              ),
            )}
          </div>
        )}
        {members.length > 0 && (
          <p className="text-xs text-text-muted mt-1">
            이름을 탭하여 수정 · ✕를 눌러 삭제
          </p>
        )}

        {members.length === 0 && (
          <EmptyState illustration="members" message="모임 참여자를 추가해 주세요" />
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
                  onClick={() => handlePresetClick(preset)}
                  aria-label={`${preset.name} 선택`}
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
          <OnboardingTooltip step="add-session" currentStep={currentStep} message="N차를 추가해 보세요!" onDismiss={dismissOnboarding}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddSession}
              disabled={members.length === 0}
              aria-label="세션 추가"
            >
              + 추가
            </Button>
          </OnboardingTooltip>
        </div>

        {sessions.length === 0 && (
          <Card className="text-center">
            <EmptyState
              illustration="sessions"
              message={members.length === 0 ? '먼저 참여자를 추가해 주세요' : '+ 추가 버튼으로 N차를 추가하세요'}
            />
          </Card>
        )}

        <OnboardingTooltip step="enter-amount" currentStep={currentStep} message="금액을 입력해 보세요!" position="top" onDismiss={dismissOnboarding}>
          <div>
            {sessions.map((session, i) => (
              <div
                key={session.id}
                className={`${newSessionIds.has(session.id) ? 'animate-spring-in' : ''} ${i > 0 ? 'mt-4' : ''}`}
                style={newSessionIds.has(session.id) ? { animationDelay: `${i * 80}ms` } : undefined}
              >
                <SessionCard
                  session={session}
                  index={i}
                  onRemove={handleRemoveSession}
                  onDuplicate={duplicateSession}
                />
              </div>
            ))}
          </div>
        </OnboardingTooltip>
      </div>

      {/* Calculate Button */}
      {sessions.length > 0 && (
        <div className="flex flex-col gap-2 pb-20">
          {/* 세션 합계 */}
          <div className="flex items-center justify-between rounded-xl bg-surface-elevated px-4 py-3">
            <span className="text-sm font-medium text-text-secondary">전체 합계</span>
            <span className="text-lg font-bold text-text-primary">
              {formatAmount(sessions.reduce((sum, s) => sum + s.totalAmount, 0))}
            </span>
          </div>
          {hasZeroAmountSession && (
            <p className="text-xs text-warning-dark text-center">
              금액이 0원인 세션이 있습니다. 정산 결과에 반영되지 않을 수 있습니다.
            </p>
          )}
        </div>
      )}

      <StickyBottomBar show={sessions.length > 0}>
        <OnboardingTooltip step="settle" currentStep={currentStep} message="정산 결과를 확인해 보세요!" position="top" onDismiss={dismissOnboarding}>
          <LinkButton href="/settlement" fullWidth size="lg" disabled={!canCalculate}>
            정산하기
          </LinkButton>
        </OnboardingTooltip>
      </StickyBottomBar>

      {/* Delete Confirmation Modal */}
      <Modal
        open={modal.isOpen('delete')}
        onClose={() => modal.close('delete')}
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
            onClick={() => modal.close('delete')}
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
        open={modal.isOpen('savePreset')}
        onClose={() => modal.close('savePreset')}
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
            onClick={() => modal.close('savePreset')}
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
        open={modal.isOpen('loadPreset')}
        onClose={() => modal.close('loadPreset')}
        title="그룹 불러오기"
      >
        <p className="mb-4 text-text-secondary">
          &lsquo;{modal.getData<MemberPreset>('loadPreset')?.name}&rsquo; 그룹을 불러오시겠습니까?
          <br />
          현재 참여자 목록이 교체됩니다.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => modal.close('loadPreset')}
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
        open={modal.isOpen('deletePreset')}
        onClose={() => modal.close('deletePreset')}
        title="그룹 삭제"
      >
        <p className="mb-4 text-text-secondary">
          저장된 그룹을 삭제하시겠습니까?
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => modal.close('deletePreset')}
          >
            취소
          </Button>
          <Button variant="danger" fullWidth onClick={confirmDeletePreset}>
            삭제
          </Button>
        </div>
      </Modal>

      {/* Session Delete Confirmation Modal */}
      <Modal
        open={modal.isOpen('deleteSession')}
        onClose={() => modal.close('deleteSession')}
        title="세션 삭제"
      >
        <p className="mb-4 text-text-secondary">
          해당 세션을 삭제하시겠습니까?
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => modal.close('deleteSession')}
          >
            취소
          </Button>
          <Button variant="danger" fullWidth onClick={confirmDeleteSession}>
            삭제
          </Button>
        </div>
      </Modal>

      {/* Preset Action Modal */}
      <Modal
        open={modal.isOpen('presetAction')}
        onClose={() => modal.close('presetAction')}
        title={modal.getData<MemberPreset>('presetAction')?.name ?? '그룹 선택'}
      >
        <p className="mb-4 text-text-secondary">
          &lsquo;{modal.getData<MemberPreset>('presetAction')?.name}&rsquo; 그룹으로 무엇을 하시겠습니까?
        </p>
        <div className="flex gap-2">
          <Button
            fullWidth
            onClick={() => {
              const preset = modal.getData<MemberPreset>('presetAction');
              if (preset) {
                modal.close('presetAction');
                handleLoadPreset(preset);
              }
            }}
          >
            불러오기
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              const preset = modal.getData<MemberPreset>('presetAction');
              if (preset) {
                modal.close('presetAction');
                handleDeletePreset(preset.id);
              }
            }}
          >
            삭제
          </Button>
        </div>
      </Modal>
    </div>
  );
}
