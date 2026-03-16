'use client';

import { useState } from 'react';
import { Card, Button } from '@/shared/ui';
import { formatAmount } from '@/shared/lib/formatters';
import { useAccountStore } from '@/entities/account';
import type { SettlementResult as SettlementResultType } from '@/shared/types';

interface SettlementResultProps {
  results: SettlementResultType[];
  payerName: string;
}

export function SettlementResult({ results, payerName }: SettlementResultProps) {
  const account = useAccountStore((s) => s.account);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyAccount = async (memberId: string) => {
    if (!account) return;
    const text = `${account.bankName} ${account.accountNumber} ${account.ownerName}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(memberId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for environments without clipboard API
    }
  };

  const positiveResults = results.filter((r) => r.totalAmount > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* 보낼 사람들 */}
      {positiveResults.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-text-secondary">
            개인별 정산 내역
          </h3>
          {positiveResults.map((result) => (
            <Card key={result.memberId} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-text-primary">
                  {result.memberName}
                </span>
                <span className="text-lg font-bold text-primary-dark">
                  {formatAmount(result.totalAmount)}
                </span>
              </div>

              {/* Session breakdown */}
              {result.details.length > 0 && (
                <div className="flex flex-col gap-1 text-sm text-text-secondary">
                  {result.details.map((detail) => (
                    <div
                      key={detail.sessionId}
                      className="flex justify-between"
                    >
                      <span>{detail.sessionTitle}</span>
                      <span>
                        {detail.baseAmount.toLocaleString('ko-KR')}
                        {detail.alcoholAmount > 0 &&
                          ` + 주류 ${detail.alcoholAmount.toLocaleString('ko-KR')}`}
                        원
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Copy account button */}
              {account && (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => handleCopyAccount(result.memberId)}
                  aria-label={`${payerName} 계좌번호 복사`}
                >
                  {copiedId === result.memberId
                    ? '복사 완료!'
                    : `계좌 복사 (${account.bankName})`}
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
