'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, Input, Chip, Switch, Button, FormField } from '@/shared/ui';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { validateSessionAmount, validateAlcoholUnitPrice, validateAlcoholQuantity } from '@/shared/lib/validators';
import type { Session } from '@/shared/types';

interface SessionCardProps {
  session: Session;
  index: number;
  onRemove: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

const PASTEL_COLORS = ['pink', 'lavender', 'mint', 'sky', 'peach'] as const;

export function SessionCard({ session, index, onRemove, onDuplicate }: SessionCardProps) {
  const members = useMemberStore((s) => s.members);
  const { updateSession, toggleParticipant, setAlcohol } = useSessionStore();
  const alcoholEnabled = !!session.alcohol;

  const [amountError, setAmountError] = useState<string | null>(null);
  const [unitPriceError, setUnitPriceError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const handleAmountBlur = () => {
    if (session.totalAmount === 0) {
      setAmountError(null);
      return;
    }
    const result = validateSessionAmount(session.totalAmount);
    setAmountError(result.valid ? null : result.error ?? null);
  };

  const handleUnitPriceBlur = () => {
    if (!session.alcohol) return;
    if (session.alcohol.unitPrice === 0) {
      setUnitPriceError(null);
      return;
    }
    const result = validateAlcoholUnitPrice(session.alcohol.unitPrice);
    setUnitPriceError(result.valid ? null : result.error ?? null);
  };

  const handleQuantityBlur = () => {
    if (!session.alcohol) return;
    if (session.alcohol.quantity === 0) {
      setQuantityError(null);
      return;
    }
    const result = validateAlcoholQuantity(session.alcohol.quantity);
    setQuantityError(result.valid ? null : result.error ?? null);
  };

  const handleTitleChange = (title: string) => {
    updateSession(session.id, { title });
  };

  const handleAmountChange = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) {
      updateSession(session.id, { totalAmount: num });
    } else if (value === '') {
      updateSession(session.id, { totalAmount: 0 });
    }
  };

  const handlePayerChange = (payerId: string) => {
    updateSession(session.id, { payerId });
  };

  const handleAlcoholToggle = (enabled: boolean) => {
    if (!enabled) {
      setAlcohol(session.id, undefined);
    } else {
      setAlcohol(session.id, {
        unitPrice: 0,
        quantity: 0,
        drinkerIds: [],
      });
    }
  };

  const handleAlcoholUnitPrice = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (session.alcohol) {
      setAlcohol(session.id, {
        ...session.alcohol,
        unitPrice: isNaN(num) ? 0 : num,
      });
    }
  };

  const handleAlcoholQuantity = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (session.alcohol) {
      setAlcohol(session.id, {
        ...session.alcohol,
        quantity: isNaN(num) ? 0 : num,
      });
    }
  };

  const handleDrinkerToggle = (memberId: string) => {
    if (!session.alcohol) return;
    const has = session.alcohol.drinkerIds.includes(memberId);
    setAlcohol(session.id, {
      ...session.alcohol,
      drinkerIds: has
        ? session.alcohol.drinkerIds.filter((id) => id !== memberId)
        : [...session.alcohol.drinkerIds, memberId],
    });
  };

  const formatAmount = (amount: number) => {
    return amount > 0 ? amount.toLocaleString('ko-KR') : '';
  };

  return (
    <Card className="relative">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{session.title || `${index + 1}차`}</CardTitle>
        <div className="flex gap-1">
          {onDuplicate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(session.id)}
              aria-label={`${session.title || `${index + 1}차`} 복제`}
            >
              복제
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(session.id)}
            aria-label={`${session.title || `${index + 1}차`} 삭제`}
          >
            삭제
          </Button>
        </div>
      </CardHeader>

      <div className="flex flex-col gap-4">
        {/* Title */}
        <Input
          label="장소/설명"
          placeholder={`${index + 1}차 (예: 고기집)`}
          value={session.title}
          onChange={(e) => handleTitleChange(e.target.value)}
        />

        {/* Total Amount */}
        <FormField error={amountError}>
          <Input
            label="총 금액"
            type="text"
            inputMode="numeric"
            placeholder="0"
            suffix="원"
            value={formatAmount(session.totalAmount)}
            onChange={(e) => handleAmountChange(e.target.value)}
            onBlur={handleAmountBlur}
          />
        </FormField>

        {/* Payer Selection */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">결제자</span>
          <div className="flex flex-wrap gap-2">
            {members.map((member, i) => (
              <Chip
                key={member.id}
                selected={session.payerId === member.id}
                color={PASTEL_COLORS[i % PASTEL_COLORS.length]}
                onClick={() => handlePayerChange(member.id)}
                aria-label={`${member.name}을(를) 결제자로 선택`}
              >
                {member.name}
              </Chip>
            ))}
          </div>
        </div>

        {/* Participant Toggle */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">참여자</span>
          <div className="flex flex-wrap gap-2">
            {members.map((member, i) => (
              <Chip
                key={member.id}
                selected={session.participantIds.includes(member.id)}
                color={PASTEL_COLORS[i % PASTEL_COLORS.length]}
                onClick={() => toggleParticipant(session.id, member.id)}
                aria-label={`${member.name} 참여 토글`}
              >
                {member.name}
              </Chip>
            ))}
          </div>
        </div>

        {/* Alcohol Switch */}
        <div className="border-t border-border pt-4">
          <Switch
            checked={alcoholEnabled}
            onChange={handleAlcoholToggle}
            label="술값 별도 정산"
          />
        </div>

        {/* Alcohol Detail */}
        {alcoholEnabled && session.alcohol && (
          <div className="flex flex-col gap-3 rounded-xl bg-pastel-peach/30 p-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField error={unitPriceError}>
                <Input
                  label="주류 단가"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  suffix="원"
                  value={formatAmount(session.alcohol.unitPrice)}
                  onChange={(e) => handleAlcoholUnitPrice(e.target.value)}
                  onBlur={handleUnitPriceBlur}
                />
              </FormField>
              <FormField error={quantityError}>
                <Input
                  label="수량"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  suffix="병"
                  value={session.alcohol.quantity > 0 ? String(session.alcohol.quantity) : ''}
                  onChange={(e) => handleAlcoholQuantity(e.target.value)}
                  onBlur={handleQuantityBlur}
                />
              </FormField>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-secondary">음주자</span>
              <div className="flex flex-wrap gap-2">
                {members
                  .filter((m) => session.participantIds.includes(m.id))
                  .map((member, i) => (
                    <Chip
                      key={member.id}
                      selected={session.alcohol!.drinkerIds.includes(member.id)}
                      color={PASTEL_COLORS[i % PASTEL_COLORS.length]}
                      onClick={() => handleDrinkerToggle(member.id)}
                      aria-label={`${member.name} 음주 여부 토글`}
                    >
                      {member.name}
                    </Chip>
                  ))}
              </div>
            </div>

            {(() => {
              const alcoholTotal = session.alcohol!.unitPrice * session.alcohol!.quantity;
              return alcoholTotal > 0 && session.totalAmount > 0 && alcoholTotal > session.totalAmount ? (
                <p className="text-xs text-warning-dark">
                  주류 합계({alcoholTotal.toLocaleString('ko-KR')}원)가 총 금액({session.totalAmount.toLocaleString('ko-KR')}원)을 초과합니다.
                </p>
              ) : null;
            })()}
          </div>
        )}
      </div>
    </Card>
  );
}
