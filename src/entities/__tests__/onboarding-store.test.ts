import { describe, expect, it, beforeEach } from 'vitest';
import { useOnboardingStore } from '../onboarding';

describe('onboarding store', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it('starts with add-member as current step', () => {
    const state = useOnboardingStore.getState();
    expect(state.currentStep).toBe('add-member');
    expect(state.completedSteps).toEqual([]);
    expect(state.dismissed).toBe(false);
  });

  it('progresses through steps in order', () => {
    useOnboardingStore.getState().completeStep('add-member');
    expect(useOnboardingStore.getState().currentStep).toBe('add-session');

    useOnboardingStore.getState().completeStep('add-session');
    expect(useOnboardingStore.getState().currentStep).toBe('enter-amount');

    useOnboardingStore.getState().completeStep('enter-amount');
    expect(useOnboardingStore.getState().currentStep).toBe('settle');

    useOnboardingStore.getState().completeStep('settle');
    expect(useOnboardingStore.getState().currentStep).toBeNull();
  });

  it('prevents duplicate step completion', () => {
    useOnboardingStore.getState().completeStep('add-member');
    useOnboardingStore.getState().completeStep('add-member');
    expect(useOnboardingStore.getState().completedSteps).toEqual(['add-member']);
  });

  it('does not progress when dismissed', () => {
    useOnboardingStore.getState().dismiss();
    useOnboardingStore.getState().completeStep('add-member');
    expect(useOnboardingStore.getState().completedSteps).toEqual([]);
    expect(useOnboardingStore.getState().currentStep).toBeNull();
  });

  it('dismiss hides all tooltips', () => {
    useOnboardingStore.getState().completeStep('add-member');
    useOnboardingStore.getState().dismiss();
    expect(useOnboardingStore.getState().dismissed).toBe(true);
    expect(useOnboardingStore.getState().currentStep).toBeNull();
  });

  it('reset restores initial state', () => {
    useOnboardingStore.getState().completeStep('add-member');
    useOnboardingStore.getState().dismiss();
    useOnboardingStore.getState().reset();

    const state = useOnboardingStore.getState();
    expect(state.dismissed).toBe(false);
    expect(state.completedSteps).toEqual([]);
    expect(state.currentStep).toBe('add-member');
  });

  it('allows out-of-order completion', () => {
    useOnboardingStore.getState().completeStep('add-session');
    expect(useOnboardingStore.getState().completedSteps).toEqual(['add-session']);
    // currentStep should be the first incomplete step
    expect(useOnboardingStore.getState().currentStep).toBe('add-member');
  });

  it('persist 키가 ggini-onboarding-storage로 설정', () => {
    // persist middleware에 의해 localStorage에 저장
    useOnboardingStore.getState().completeStep('add-member');
    const stored = localStorage.getItem('ggini-onboarding-storage');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.completedSteps).toContain('add-member');
  });

  it('모든 스텝 완료 후 currentStep이 null', () => {
    const steps = ['add-member', 'add-session', 'enter-amount', 'settle'] as const;
    for (const step of steps) {
      useOnboardingStore.getState().completeStep(step);
    }
    expect(useOnboardingStore.getState().currentStep).toBeNull();
    expect(useOnboardingStore.getState().completedSteps).toHaveLength(4);
  });
});
