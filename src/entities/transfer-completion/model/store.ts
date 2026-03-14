import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TransferCompletionState {
  completions: Record<string, boolean>;
  toggleCompletion: (key: string) => void;
  isCompleted: (key: string) => boolean;
  reset: () => void;
}

export function getTransferKey(from: string, to: string, amount: number): string {
  return `${from}-${to}-${amount}`;
}

export const useTransferCompletionStore = create<TransferCompletionState>()(
  persist(
    (set, get) => ({
      completions: {},

      toggleCompletion: (key) => {
        set((state) => ({
          completions: {
            ...state.completions,
            [key]: !state.completions[key],
          },
        }));
      },

      isCompleted: (key) => {
        return !!get().completions[key];
      },

      reset: () => {
        set({ completions: {} });
      },
    }),
    { name: 'ggini-transfer-completion' },
  ),
);
