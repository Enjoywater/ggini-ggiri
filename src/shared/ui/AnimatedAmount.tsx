'use client';

import { useAnimatedNumber } from '@/shared/lib/use-animated-number';

interface AnimatedAmountProps {
  amount: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export function AnimatedAmount({
  amount,
  duration = 150,
  suffix = '원',
  className = '',
}: AnimatedAmountProps) {
  const displayValue = useAnimatedNumber(amount, duration);

  return (
    <span className={className} aria-label={`${amount.toLocaleString('ko-KR')}${suffix}`}>
      {displayValue.toLocaleString('ko-KR')}{suffix}
    </span>
  );
}
