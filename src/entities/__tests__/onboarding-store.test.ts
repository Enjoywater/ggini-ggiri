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
});
