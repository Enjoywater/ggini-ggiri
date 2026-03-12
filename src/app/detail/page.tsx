'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { decompressData } from '@/shared/lib/serializer';
import type { ShareableData } from '@/shared/lib/serializer';
import { Card, CardTitle, Button } from '@/shared/ui';
import { Suspense } from 'react';
import Link from 'next/link';

function DetailContent() {
  const searchParams = useSearchParams();

  const result = useMemo<
    { ok: true; data: ShareableData } | { ok: false; error: string }
  >(() => {
    const encoded = searchParams.get('d');
    if (!encoded) {
      return { ok: false, error: '공유 데이터가 없습니다.' };
    }
    try {
      return { ok: true, data: decompressData(encoded) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '데이터 복원에 실패했습니다.';
      return { ok: false, error: msg };
    }
  }, [searchParams]);

  if (!result.ok) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Card className="bg-pastel-coral/20 text-center">
          <p className="text-sm font-medium text-danger-dark">{result.error}</p>
          <p className="mt-2 text-xs text-text-muted">
            링크가 잘못되었거나 만료되었을 수 있습니다.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              메인으로 이동
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { members, sessions, settlement } = result.data;
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">정산 상세 내역</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {sessions.length}개 차수 / {members.length}명 참여
        </p>
      </div>

      {/* Session breakdown */}
      <div className="flex flex-col gap-3">
        {sessions.map((session) => (
          <Card key={session.id}>
            <div className="flex items-center justify-between">
              <CardTitle>{session.title}</CardTitle>
              <span className="text-base font-medium text-text-primary">
                {session.totalAmount.toLocaleString('ko-KR')}원
              </span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              결제: {memberMap.get(session.payerId) ?? '알 수 없음'} / 참여{' '}
              {session.participantIds.length}명
            </p>
            {session.alcohol && (
              <p className="mt-1 text-sm text-pastel-coral-dark">
                주류: {session.alcohol.unitPrice.toLocaleString('ko-KR')}원 x{' '}
                {session.alcohol.quantity}개 (음주{' '}
                {session.alcohol.drinkerIds.length}명)
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Per-member settlement */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text-primary">개인별 정산</h2>
        {settlement.map((item) => (
          <Card key={item.memberId}>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-text-primary">
                {item.memberName}
              </span>
              <span
                className={`text-base font-bold ${
                  item.totalAmount > 0
                    ? 'text-danger-dark'
                    : item.totalAmount < 0
                      ? 'text-primary-dark'
                      : 'text-text-muted'
                }`}
              >
                {item.totalAmount > 0 ? '+' : ''}
                {item.totalAmount.toLocaleString('ko-KR')}원
              </span>
            </div>
            {item.details.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {item.details.map((d) => (
                  <div
                    key={d.sessionId}
                    className="flex justify-between text-sm text-text-secondary"
                  >
                    <span>{d.sessionTitle}</span>
                    <span>
                      {d.baseAmount.toLocaleString('ko-KR')}
                      {d.alcoholAmount > 0 &&
                        ` + 주류 ${d.alcoholAmount.toLocaleString('ko-KR')}`}
                      원
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-text-muted">로딩 중...</p>
        </div>
      }
    >
      <DetailContent />
    </Suspense>
  );
}
