'use client';

import { useMemo, useState } from 'react';
import { Card, Button, AnimatedAmount } from '@/shared/ui';
import { useAccountStore } from '@/entities/account';
import { useToast } from '@/shared/lib/use-toast';
import { PASTEL_COLORS } from '@/shared/lib';
import type { PastelColor } from '@/shared/lib/constants';
import type { SettlementResult as SettlementResultType, Session, SessionSettlement, Member } from '@/shared/types';

interface SettlementResultProps {
  results: SettlementResultType[];
  payerName: string;
  sessions?: Session[];
  members?: Member[];
}

const tintStyleMap: Record<PastelColor, { bg: React.CSSProperties; dot: React.CSSProperties }> = {
  pink: {
    bg: { backgroundColor: 'color-mix(in srgb, var(--pastel-pink) 15%, transparent)' },
    dot: { backgroundColor: 'var(--pastel-pink-dark)' },
  },
  lavender: {
    bg: { backgroundColor: 'color-mix(in srgb, var(--pastel-lavender) 15%, transparent)' },
    dot: { backgroundColor: 'var(--pastel-lavender-dark)' },
  },
  mint: {
    bg: { backgroundColor: 'color-mix(in srgb, var(--pastel-mint) 15%, transparent)' },
    dot: { backgroundColor: 'var(--pastel-mint-dark)' },
  },
  sky: {
    bg: { backgroundColor: 'color-mix(in srgb, var(--pastel-sky) 15%, transparent)' },
    dot: { backgroundColor: 'var(--pastel-sky-dark)' },
  },
  peach: {
    bg: { backgroundColor: 'color-mix(in srgb, var(--pastel-peach) 15%, transparent)' },
    dot: { backgroundColor: 'var(--pastel-peach-dark)' },
  },
};

/** 세션 데이터에서 해당 세션의 계산 근거 문자열을 생성 */
function buildFormulaLines(detail: SessionSettlement, session: Session | undefined): string[] {
  if (!session) return [];
  const lines: string[] = [];

  const alcoholTotal = session.alcohol
    ? session.alcohol.unitPrice * session.alcohol.quantity
    : 0;
  const clampedAlcoholTotal = Math.min(alcoholTotal, session.totalAmount);
  const participantCount = session.participantIds.length;

  lines.push(
    `기본 = (총액 ${session.totalAmount.toLocaleString('ko-KR')}원 - 주류 ${clampedAlcoholTotal.toLocaleString('ko-KR')}원) ÷ ${participantCount}명 = ${detail.baseAmount.toLocaleString('ko-KR')}원`,
  );

  if (detail.alcoholAmount > 0 && session.alcohol) {
    const drinkerCount = session.alcohol.drinkerIds.length;
    lines.push(
      `주류 = ${clampedAlcoholTotal.toLocaleString('ko-KR')}원 ÷ ${drinkerCount}명 = ${detail.alcoholAmount.toLocaleString('ko-KR')}원`,
    );
  }

  lines.push('10원 단위 절사 적용');

  return lines;
}

export function SettlementResult({ results, payerName, sessions, members }: SettlementResultProps) {
  const account = useAccountStore((s) => s.account);
  const toast = useToast();
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const tintMap = useMemo(() => {
    const map = new Map<string, PastelColor>();
    if (members) {
      members.forEach((m, i) => {
        map.set(m.id, PASTEL_COLORS[i % PASTEL_COLORS.length]);
      });
    }
    return map;
  }, [members]);

  const toggleExpanded = (memberId: string) => {
    setExpandedMap((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const sessionMap = useMemo(() => {
    const map = new Map<string, Session>();
    if (sessions) {
      for (const s of sessions) map.set(s.id, s);
    }
    return map;
  }, [sessions]);

  const handleCopyAccount = async () => {
    if (!account) return;
    const text = `${account.bankName} ${account.accountNumber} ${account.ownerName}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('계좌 정보가 복사되었습니다');
    } catch {
      alert('복사에 실패했습니다. 직접 계좌 정보를 확인해주세요.');
    }
  };

  const positiveResults = results.filter((r) => r.totalAmount > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* 보낼 사람들 */}
      {positiveResults.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-text-secondary animate-fade-up">
            개인별 정산 내역
          </h3>
          {positiveResults.map((result, index) => (
            <Card key={result.memberId} className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: `${(index + 1) * 80}ms`, ...(tintMap.has(result.memberId) ? tintStyleMap[tintMap.get(result.memberId)!].bg : {}) }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tintMap.has(result.memberId) && (
                    <span
                      className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                      style={tintStyleMap[tintMap.get(result.memberId)!].dot}
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-base font-semibold text-text-primary">
                    {result.memberName}
                  </span>
                </div>
                <AnimatedAmount amount={result.totalAmount} duration={400} className="text-lg font-bold text-primary-dark" />
              </div>

              {/* Session breakdown */}
              {result.details.length > 0 && (
                <div className="flex flex-col gap-1 text-sm text-text-secondary">
                  {result.details.map((detail) => (
                    <div key={detail.sessionId} className="flex flex-col">
                      <div className="flex justify-between">
                        <span>{detail.sessionTitle}</span>
                        <span>
                          {detail.baseAmount.toLocaleString('ko-KR')}
                          {detail.alcoholAmount > 0 &&
                            ` + 주류 ${detail.alcoholAmount.toLocaleString('ko-KR')}`}
                          원
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 계산 근거 토글 */}
              {sessions && result.details.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(result.memberId)}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
                    aria-expanded={!!expandedMap[result.memberId]}
                    aria-label={`${result.memberName} 계산 근거 ${expandedMap[result.memberId] ? '접기' : '펼치기'}`}
                  >
                    <span
                      className="inline-block transition-transform duration-200"
                      style={{
                        transform: expandedMap[result.memberId] ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▶
                    </span>
                    계산 근거
                  </button>
                  {expandedMap[result.memberId] && (
                    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-pastel-sky/20 px-3 py-2 text-xs text-text-secondary">
                      {result.details.map((detail) => {
                        const session = sessionMap.get(detail.sessionId);
                        const lines = buildFormulaLines(detail, session);
                        return (
                          <div key={detail.sessionId} className="flex flex-col gap-0.5">
                            <span className="font-medium text-text-primary">{detail.sessionTitle}</span>
                            {lines.map((line, i) => (
                              <span key={i} className="pl-2">{line}</span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Copy account button */}
              {account && (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => handleCopyAccount()}
                  aria-label={`${payerName} 계좌번호 복사`}
                >
                  {`계좌 복사 (${account.bankName})`}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {positiveResults.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-text-muted">정산할 내역이 없습니다</p>
        </Card>
      )}
    </div>
  );
}
