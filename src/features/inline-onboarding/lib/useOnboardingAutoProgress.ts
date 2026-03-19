'use client';

import { useEffect } from 'react';
import { useOnboardingStore } from '@/entities/onboarding';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';

export function useOnboardingAutoProgress() {
  const members = useMemberStore((s) => s.members);
  const sessions = useSessionStore((s) => s.sessions);
  const { dismissed, completedSteps, completeStep } = useOnboardingStore();

  useEffect(() => {
    if (dismissed) return;

    if (members.length >= 1 && !completedSteps.includes('add-member')) {
      completeStep('add-member');
    }
    if (sessions.length >= 1 && !completedSteps.includes('add-session')) {
      completeStep('add-session');
    }
    if (sessions.some((s) => s.totalAmount > 0) && !completedSteps.includes('enter-amount')) {
      completeStep('enter-amount');
    }
  }, [members, sessions, dismissed, completedSteps, completeStep]);
}
