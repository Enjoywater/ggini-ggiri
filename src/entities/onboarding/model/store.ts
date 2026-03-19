import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OnboardingStep = 'add-member' | 'add-session' | 'enter-amount' | 'settle';

const STEP_ORDER: OnboardingStep[] = ['add-member', 'add-session', 'enter-amount', 'settle'];

interface OnboardingState {
  dismissed: boolean;
  completedSteps: OnboardingStep[];
  currentStep: OnboardingStep | null;
  completeStep: (step: OnboardingStep) => void;
  dismiss: () => void;
  reset: () => void;
}

function getNextStep(completedSteps: OnboardingStep[]): OnboardingStep | null {
  for (const step of STEP_ORDER) {
    if (!completedSteps.includes(step)) return step;
  }
  return null;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      dismissed: false,
      completedSteps: [],
      currentStep: STEP_ORDER[0],

      completeStep: (step) =>
        set((state) => {
          if (state.dismissed) return state;
          if (state.completedSteps.includes(step)) return state;
          const completedSteps = [...state.completedSteps, step];
          const currentStep = getNextStep(completedSteps);
          return { completedSteps, currentStep };
        }),

      dismiss: () =>
        set({ dismissed: true, currentStep: null }),

      reset: () =>
        set({
          dismissed: false,
          completedSteps: [],
          currentStep: STEP_ORDER[0],
        }),
    }),
    {
      name: 'ggini-onboarding-storage',
    },
  ),
);
