'use client';

import { Card, Button, AnimatedAmount } from '@/shared/ui';
import { useAccountStore } from '@/entities/account';
import { useToast } from '@/shared/lib/use-toast';
import type { SettlementResult as SettlementResultType } from '@/shared/types';

interface SettlementResultProps {
  results: SettlementResultType[];
  payerName: string;
}

export function SettlementResult({ results, payerName }: SettlementResultProps) {
  const account = useAccountStore((s) => s.account);
  const toast = useToast();

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
            <Card key={result.memberId} className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: `${(index + 1) * 80}ms` }}>
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-text-primary">
                  {result.memberName}
                </span>
                <AnimatedAmount amount={result.totalAmount} duration={400} className="text-lg font-bold text-primary-dark" />
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
