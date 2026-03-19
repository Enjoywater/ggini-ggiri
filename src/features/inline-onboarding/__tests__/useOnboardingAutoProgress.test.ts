import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnboardingStore } from '@/entities/onboarding';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useOnboardingAutoProgress } from '../lib/useOnboardingAutoProgress';

describe('useOnboardingAutoProgress', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
    useMemberStore.getState().reset();
    useSessionStore.getState().reset();
  });

  it('completes add-member when a member is added', () => {
    renderHook(() => useOnboardingAutoProgress());

    act(() => {
      useMemberStore.getState().addMember('홍길동');
    });

    // Re-render to trigger effect
    renderHook(() => useOnboardingAutoProgress());

    expect(useOnboardingStore.getState().completedSteps).toContain('add-member');
  });

  it('completes add-session when a session is added', () => {
    renderHook(() => useOnboardingAutoProgress());

    act(() => {
      useMemberStore.getState().addMember('홍길동');
      const members = useMemberStore.getState().members;
      useSessionStore.getState().addSession({
        title: '1차',
        totalAmount: 0,
        payerId: members[0].id,
        participantIds: [members[0].id],
      });
    });

    renderHook(() => useOnboardingAutoProgress());

    expect(useOnboardingStore.getState().completedSteps).toContain('add-session');
  });

  it('completes enter-amount when a session has amount > 0', () => {
    renderHook(() => useOnboardingAutoProgress());

    act(() => {
      useMemberStore.getState().addMember('홍길동');
      const members = useMemberStore.getState().members;
      useSessionStore.getState().addSession({
        title: '1차',
        totalAmount: 50000,
        payerId: members[0].id,
        participantIds: [members[0].id],
      });
    });

    renderHook(() => useOnboardingAutoProgress());

    expect(useOnboardingStore.getState().completedSteps).toContain('enter-amount');
  });

  it('does not progress when dismissed', () => {
    act(() => {
      useOnboardingStore.getState().dismiss();
    });

    renderHook(() => useOnboardingAutoProgress());

    act(() => {
      useMemberStore.getState().addMember('홍길동');
    });

    renderHook(() => useOnboardingAutoProgress());

    expect(useOnboardingStore.getState().completedSteps).toEqual([]);
  });
});
