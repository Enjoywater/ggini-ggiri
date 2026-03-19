'use client';

import { useState } from 'react';
import { Button, LinkButton, Card, Modal, EmptyState } from '@/shared/ui';
import { useHistoryStore } from '@/entities/history';
import { useHydration } from '@/shared/lib/use-hydration';
import { SettlementResult } from '@/widgets/settlement-result';
import type { SettlementHistory } from '@/shared/types';
import { formatDate, formatAmount, findMainPayer } from '@/shared/lib/formatters';

function MemberNamesText({ names }: { names: string[] }) {
  if (names.length <= 3) {
    return <span>{names.join(', ')}</span>;
  }
  return (
    <span>
      {names.slice(0, 3).join(', ')} 외 {names.length - 3}명
    </span>
  );
}

function HistoryDetail({ history }: { history: SettlementHistory }) {
  const mainPayer = findMainPayer(history.sessions, history.members);

  return (
    <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-border">
      {/* Transfer Summary */}
      {history.transfers.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-text-secondary">송금 요약</h4>
          {history.transfers.map((t) => {
            const fromMember = history.members.find((m) => m.id === t.from);
            const toMember = history.members.find((m) => m.id === t.to);
            return (
              <div
                key={`${t.from}-${t.to}-${t.amount}`}
                className="flex items-center justify-between rounded-xl bg-pastel-sky/30 px-3 py-2 text-sm"
              >
                <span className="text-text-primary">
                  <strong>{fromMember?.name}</strong>
                  {' → '}
                  <strong>{toMember?.name}</strong>
                </span>
                <span className="font-bold text-primary-dark">
                  {formatAmount(t.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Settlement Details */}
      <SettlementResult
        results={history.results}
        payerName={mainPayer?.name ?? '결제자'}
        sessions={history.sessions}
        members={history.members}
      />
    </div>
  );
}

export function HistoryPage() {
  const hydrated = useHydration();
  const { histories, removeHistory } = useHistoryStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      removeHistory(deleteTarget);
      if (expandedId === deleteTarget) {
        setExpandedId(null);
      }
      setDeleteTarget(null);
    }
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
        <LinkButton href="/" aria-label="뒤로 가기" variant="ghost" size="sm">
          &larr;
        </LinkButton>
        <h1 className="text-xl font-bold text-text-primary">정산 기록</h1>
      </div>

      {/* History List */}
      {histories.length === 0 ? (
        <Card className="text-center">
          <EmptyState illustration="history" message="아직 정산 기록이 없습니다" />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {histories.map((history) => (
            <Card
              key={history.id}
              className="cursor-pointer transition-colors hover:bg-surface"
              onClick={() => handleToggleExpand(history.id)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleExpand(history.id);
                }
              }}
              tabIndex={0}
              role="button"
              aria-expanded={expandedId === history.id}
              aria-label={`${history.title} 정산 기록`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">
                      {formatDate(history.createdAt)}
                    </span>
                    <span className="text-xs text-text-muted">
                      {history.sessionCount}차
                    </span>
                  </div>
                  <p className="text-lg font-bold text-text-primary">
                    {formatAmount(history.totalAmount)}
                  </p>
                  <p className="text-sm text-text-secondary truncate">
                    <MemberNamesText names={history.memberNames} />
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteClick(e, history.id)}
                  aria-label={`${history.title} 삭제`}
                >
                  삭제
                </Button>
              </div>

              {expandedId === history.id && (
                <HistoryDetail history={history} />
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="정산 기록 삭제"
      >
        <p className="mb-4 text-text-secondary">
          이 정산 기록을 삭제하시겠습니까?
          <br />
          삭제된 기록은 복구할 수 없습니다.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setDeleteTarget(null)}
          >
            취소
          </Button>
          <Button variant="danger" fullWidth onClick={confirmDelete}>
            삭제
          </Button>
        </div>
      </Modal>
    </div>
  );
}
