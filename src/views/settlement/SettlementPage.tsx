'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button, LinkButton, CheckAnimation, SettlementPageSkeleton, CelebrationBanner } from '@/shared/ui';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useAccountStore } from '@/entities/account';
import { useHistoryStore } from '@/entities/history';
import { useTransferCompletionStore, getTransferKey } from '@/entities/transfer-completion';
import { useHydration } from '@/shared/lib/use-hydration';
import { useToast } from '@/shared/lib/use-toast';
import { findMainPayer, formatAmount } from '@/shared/lib/formatters';
import { settle, calculateBalance, optimizeTransfers } from '@/features/calculate';
import { ShareButton } from '@/features/share';
import { buildSettlementText, shareText } from '@/features/share';
import { SettlementResult } from '@/widgets/settlement-result';
import type { Transfer, Member } from '@/shared/types';
import Link from 'next/link';

function TransferSummary({
  transfers,
  members,
  completions,
  toggleCompletion,
  resetCompletions,
}: {
  transfers: Transfer[];
  members: Member[];
  completions: Record<string, boolean>;
  toggleCompletion: (key: string) => void;
  resetCompletions: () => void;
}) {
  const completedCount = transfers.filter((t) => {
    const key = getTransferKey(t.from, t.to, t.amount);
    return !!completions[key];
  }).length;
  const hasAnyCompleted = completedCount > 0;

  const allComplete = transfers.length > 0 && completedCount === transfers.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-secondary animate-fade-up">
          송금 요약
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">
            {completedCount}/{transfers.length} 완료
          </span>
          {hasAnyCompleted && (
            <Button variant="ghost" size="sm" onClick={resetCompletions}>
              초기화
            </Button>
          )}
        </div>
      </div>
      {transfers.map((t, index) => {
        const key = getTransferKey(t.from, t.to, t.amount);
        const completed = !!completions[key];
        const fromMember = members.find((m) => m.id === t.from);
        const toMember = members.find((m) => m.id === t.to);
        return (
          <button
            key={`${t.from}-${t.to}-${t.amount}`}
            type="button"
            onClick={() => toggleCompletion(key)}
            aria-label={`${fromMember?.name}에서 ${toMember?.name}에게 ${formatAmount(t.amount)} 송금 ${completed ? '완료 해제' : '완료 표시'}`}
            className={`flex w-full min-h-[44px] items-center justify-between rounded-xl px-4 py-3 text-left transition-colors animate-fade-up ${
              completed
                ? 'bg-pastel-mint/30'
                : 'bg-pastel-sky/30'
            }`}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <span
              className={`text-base text-text-primary ${
                completed ? 'line-through opacity-60' : ''
              }`}
            >
              <CheckAnimation checked={completed} className="mr-1" />
              <strong>{fromMember?.name}</strong>
              {' \u2192 '}
              <strong>{toMember?.name}</strong>
            </span>
            <span
              className={`text-lg font-bold text-primary-dark ${
                completed ? 'line-through opacity-60' : ''
              }`}
            >
              {formatAmount(t.amount)}
            </span>
          </button>
        );
      })}
      <CelebrationBanner show={allComplete} />
    </div>
  );
}

export function SettlementPage() {
  const hydrated = useHydration();
  const members = useMemberStore((s) => s.members);
  const sessions = useSessionStore((s) => s.sessions);
  const account = useAccountStore((s) => s.account);
  const toast = useToast();
  const completions = useTransferCompletionStore((s) => s.completions);
  const toggleCompletion = useTransferCompletionStore((s) => s.toggleCompletion);
  const resetCompletions = useTransferCompletionStore((s) => s.reset);

  const { results, transfers } = useMemo(() => {
    if (sessions.length === 0 || members.length === 0) {
      return { results: [], transfers: [] as Transfer[] };
    }
    const results = settle(sessions, members);
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);
    return { results, transfers };
  }, [sessions, members]);

  const mainPayer = useMemo(() => findMainPayer(sessions, members), [sessions, members]);

  const totalAmount = useMemo(() => sessions.reduce((sum, s) => sum + s.totalAmount, 0), [sessions]);

  // Build a fingerprint from session IDs + totalAmount to detect duplicate saves
  const fingerprint = useMemo(() => {
    if (sessions.length === 0) return '';
    const sortedIds = sessions.map((s) => s.id).sort().join(',');
    return `${sortedIds}:${totalAmount}`;
  }, [sessions, totalAmount]);

  // Auto-save to history (deduplicated across mounts)
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current) return;
    if (results.length === 0) return;
    if (!fingerprint) return;

    // Secondary guard: sessionStorage check for cross-navigation duplicates
    const STORAGE_KEY = 'lastSavedFingerprint';
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === fingerprint) {
      savedRef.current = true;
      return;
    }

    // Primary guard: check if history store already has an entry with the same fingerprint
    const existing = useHistoryStore.getState().histories.some((h) => {
      const ids = h.sessions.map((s) => s.id).sort().join(',');
      return `${ids}:${h.totalAmount}` === fingerprint;
    });
    if (existing) {
      savedRef.current = true;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, fingerprint);
      }
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    useHistoryStore.getState().addHistory({
      title: `${year}.${month}.${day} 정산`,
      memberNames: members.map((m) => m.name),
      totalAmount,
      sessionCount: sessions.length,
      members: [...members],
      sessions: [...sessions],
      results: [...results],
      transfers: transfers.map((t) => ({ from: t.from, to: t.to, amount: t.amount })),
    });
    savedRef.current = true;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, fingerprint);
    }
  }, [results, transfers, members, sessions, totalAmount, fingerprint]);

  const handleTextShare = useCallback(async () => {
    try {
      const text = buildSettlementText({
        transfers,
        members,
        account,
        totalLabel: formatAmount(totalAmount),
        sessions,
        results,
      });
      const result = await shareText(text);
      toast.success(result === 'copied' ? '클립보드에 복사되었습니다!' : '공유 완료!');
    } catch {
      // 사용자가 공유를 취소한 경우
    }
  }, [transfers, members, account, totalAmount, sessions, results, toast]);

  if (!hydrated) {
    return <SettlementPageSkeleton />;
  }

  if (sessions.length === 0 || members.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-sm text-text-muted animate-breathing">정산할 데이터가 없습니다.</p>
        <LinkButton href="/" variant="secondary" size="sm">메인으로 이동</LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkButton href="/" aria-label="뒤로 가기" variant="ghost" size="sm">
          &larr;
        </LinkButton>
        <h1 className="text-xl font-bold text-text-primary animate-bounce-in">정산 결과</h1>
      </div>

      {/* Transfer Summary */}
      {transfers.length > 0 && (
        <TransferSummary
          transfers={transfers}
          members={members}
          completions={completions}
          toggleCompletion={toggleCompletion}
          resetCompletions={resetCompletions}
        />
      )}

      {/* Detail per member */}
      <SettlementResult
        results={results}
        payerName={mainPayer?.name ?? '결제자'}
        sessions={sessions}
        members={members}
      />

      {/* Account Notice */}
      {!account && (
        <Link href="/settings" className="block">
          <div className="flex items-center justify-between rounded-xl bg-pastel-peach/30 px-4 py-3 transition-colors hover:bg-pastel-peach/50">
            <div>
              <p className="text-sm font-medium text-text-primary">계좌 정보를 설정해 보세요</p>
              <p className="text-xs text-text-muted">설정하면 공유 시 입금 정보가 자동 포함됩니다</p>
            </div>
            <span className="text-text-muted">&rarr;</span>
          </div>
        </Link>
      )}

      {/* Share */}
      <section className="rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 p-5 flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text-primary">공유하기</h2>
        <ShareButton
          data={{ members, sessions, settlement: results, transfers: transfers.map((t) => ({ from: t.from, to: t.to, amount: t.amount })) }}
          transfers={transfers}
          members={members}
          account={account}
          totalLabel={formatAmount(totalAmount)}
        />
        <Button
          variant="secondary"
          fullWidth
          size="md"
          onClick={handleTextShare}
          aria-label="정산 결과 텍스트 복사"
        >
          <span className="inline-flex items-center gap-2">
            <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
              <path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4zm1 3h6v1H5V5zm0 2.5h6v1H5v-1zm0 2.5h4v1H5V10z" fill="currentColor"/>
            </svg>
            텍스트로 공유/복사
          </span>
        </Button>
      </section>

      {/* Back to main */}
      <LinkButton href="/" variant="ghost" fullWidth>
        처음으로
      </LinkButton>
    </div>
  );
}
