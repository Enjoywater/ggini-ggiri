import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SettlementHistory } from '@/shared/types';
import { createId } from '@/shared/lib/nanoid';

const MAX_HISTORY = 50;

interface HistoryState {
  histories: SettlementHistory[];
  addHistory: (history: Omit<SettlementHistory, 'id' | 'createdAt'>) => SettlementHistory;
  removeHistory: (id: string) => void;
  getHistory: (id: string) => SettlementHistory | undefined;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      histories: [],

      addHistory: (params) => {
        const history: SettlementHistory = {
          id: createId(),
          createdAt: Date.now(),
          title: params.title,
          memberNames: [...params.memberNames],
          totalAmount: params.totalAmount,
          sessionCount: params.sessionCount,
          members: params.members.map((m) => ({ ...m })),
          sessions: params.sessions.map((s) => ({
            ...s,
            participantIds: [...s.participantIds],
            alcohol: s.alcohol
              ? { ...s.alcohol, drinkerIds: [...s.alcohol.drinkerIds] }
              : undefined,
          })),
          results: params.results.map((r) => ({
            ...r,
            details: r.details.map((d) => ({ ...d })),
          })),
          transfers: params.transfers.map((t) => ({ ...t })),
        };
        set((state) => {
          const next = [history, ...state.histories];
          // FIFO: remove oldest when exceeding limit
          if (next.length > MAX_HISTORY) {
            return { histories: next.slice(0, MAX_HISTORY) };
          }
          return { histories: next };
        });
        return history;
      },

      removeHistory: (id) => {
        set((state) => ({
          histories: state.histories.filter((h) => h.id !== id),
        }));
      },

      getHistory: (id) => {
        return get().histories.find((h) => h.id === id);
      },

      clearAll: () => {
        set({ histories: [] });
      },
    }),
    { name: 'ggini-history-storage' },
  ),
);
