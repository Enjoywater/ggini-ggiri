'use client';

import type { ReactNode } from 'react';
import type { OnboardingStep } from '@/entities/onboarding';

interface OnboardingTooltipProps {
  step: OnboardingStep;
  currentStep: OnboardingStep | null;
  children: ReactNode;
  message: string;
  position?: 'top' | 'bottom';
  onDismiss: () => void;
}

export function OnboardingTooltip({
  step,
  currentStep,
  children,
  message,
  position = 'bottom',
  onDismiss,
}: OnboardingTooltipProps) {
  const isActive = step === currentStep;

  return (
    <div className="relative">
      {children}
      {isActive && (
        <div
          role="tooltip"
          className={`absolute left-1/2 z-50 -translate-x-1/2 animate-spring-in ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="rounded-xl bg-primary px-4 py-2.5 shadow-lg whitespace-nowrap">
            <p className="text-sm font-medium text-white">{message}</p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-1 text-xs text-white/70 hover:text-white transition-colors"
            >
              건너뛰기
            </button>
          </div>
          <div
            className={`absolute left-1/2 -translate-x-1/2 h-0 w-0 border-x-[6px] border-x-transparent ${
              position === 'top'
                ? 'top-full border-t-[6px] border-t-primary'
                : 'bottom-full border-b-[6px] border-b-primary'
            }`}
          />
        </div>
      )}
    </div>
  );
}
