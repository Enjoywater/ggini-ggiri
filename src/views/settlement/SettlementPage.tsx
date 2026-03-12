'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/shared/ui';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useAccountStore } from '@/entities/account';
import { useHistoryStore } from '@/entities/history';
import { useHydration } from '@/shared/lib/use-hydration';
import { settle, calculateBalance, optimizeTransfers } from '@/features/calculate';
import { ShareButton } from '@/features/share';
import { buildSettlementText, shareText } from '@/features/share/lib/text-share';
import { SettlementResult } from '@/widgets/settlement-result';
import type { Transfer } from '@/features/calculate';
import type { ShareableData } from '@/shared/lib/serializer';
import Link from 'next/link';

export function SettlementPage() {
  const hydrated = useHydration();
  const members = useMemberStore((s) => s.members);
  const sessions = useSessionStore((s) => s.sessions);
  const account = useAccountStore((s) => s.account);
  const [textShareStatus, setTextShareStatus] = useState<string | null>(null);

  const { results, transfers } = useMemo(() => {
    if (sessions.length === 0 || members.length === 0) {
      return { results: [], transfers: [] as Transfer[] };
    }
    const results = settle(sessions, members);
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);
    return { results, transfers };
  }, [sessions, members]);

  // Find the main payer (person who paid the most)
  const mainPayer = useMemo(() => {
    const payerMap = new Map<string, number>();
    for (const session of sessions) {
      const prev = payerMap.get(session.payerId) || 0;
      payerMap.set(session.payerId, prev + session.totalAmount);
    }
    let maxId = '';
    let maxAmount = 0;
    for (const [id, amount] of payerMap) {
      if (amount > maxAmount) {
        maxId = id;
        maxAmount = amount;
      }
    }
    return members.find((m) => m.id === maxId);
  }, [sessions, members]);

  const totalAmount = sessions.reduce((sum, s) => sum + s.totalAmount, 0);

  // Auto-save to history (once per mount)
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current) return;
    if (results.length === 0) return;

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
  }, [results, transfers, members, sessions, totalAmount]);

  const shareData: ShareableData = useMemo(
    () => ({ members, sessions, settlement: results }),
    [members, sessions, results],
  );

  const handleTextShare = useCallback(async () => {
    setTextShareStatus(null);
    try {
      const text = buildSettlementText({
        transfers,
        members,
        account,
        totalLabel: `${totalAmount.toLocaleString('ko-KR')}원`,
        sessions,
        results,
      });
      const result = await shareText(text);
      setTextShareStatus(result === 'copied' ? '클립보드에 복사되었습니다!' : '공유 완료!');
      setTimeout(() => setTextShareStatus(null), 2000);
    } catch {
      // 사용자가 공유를 취소한 경우
    }
  }, [transfers, members, account, totalAmount, sessions, results]);

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
        <h1 className="text-xl font-bold text-text-primary">정산 결과</h1>
      </div>

      {/* Transfer Summary */}
      {transfers.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-text-secondary">
            송금 요약
          </h2>
          {transfers.map((t, i) => {
            const fromMember = members.find((m) => m.id === t.from);
            const toMember = members.find((m) => m.id === t.to);
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl bg-pastel-sky/30 px-4 py-3"
              >
                <span className="text-base text-text-primary">
                  <strong>{fromMember?.name}</strong>
                  {' → '}
                  <strong>{toMember?.name}</strong>
                </span>
                <span className="text-lg font-bold text-primary-dark">
                  {t.amount.toLocaleString('ko-KR')}원
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail per member */}
      <SettlementResult
        results={results}
        payerName={mainPayer?.name ?? '결제자'}
      />

      {/* Share */}
      <div className="flex flex-col gap-2">
        <ShareButton
          data={shareData}
          account={account}
          totalLabel={`${totalAmount.toLocaleString('ko-KR')}원`}
        />
        <Button
          variant="secondary"
          fullWidth
          size="md"
          onClick={handleTextShare}
          aria-label="정산 결과 텍스트 복사"
        >
          {textShareStatus ?? '텍스트로 공유/복사'}
        </Button>
      </div>

      {/* Back to main */}
      <Link href="/" className="block">
        <Button variant="ghost" fullWidth>
          처음으로
        </Button>
      </Link>
    </div>
  );
}
