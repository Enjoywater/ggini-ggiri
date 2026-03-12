import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AlcoholDetail, Session } from '@/shared/types';
import { createId } from '@/shared/lib/nanoid';

interface SessionState {
  sessions: Session[];
  addSession: (params: Omit<Session, 'id'>) => Session;
  updateSession: (id: string, params: Partial<Omit<Session, 'id'>>) => void;
  removeSession: (id: string) => void;
  getSession: (id: string) => Session | undefined;
  duplicateSession: (id: string) => Session | undefined;
  toggleParticipant: (sessionId: string, memberId: string) => void;
  setAlcohol: (sessionId: string, alcohol: AlcoholDetail | undefined) => void;
  removeMemberFromSessions: (memberId: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (params) => {
        const session: Session = { id: createId(), ...params };
        set((state) => ({ sessions: [...state.sessions, session] }));
        return session;
      },

      updateSession: (id, params) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...params } : s,
          ),
        }));
      },

      removeSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        }));
      },

      getSession: (id) => {
        return get().sessions.find((s) => s.id === id);
      },

      duplicateSession: (id) => {
        const original = get().sessions.find((s) => s.id === id);
        if (!original) return undefined;

        const newSession: Session = {
          id: createId(),
          title: original.title + ' (복사)',
          totalAmount: original.totalAmount,
          payerId: original.payerId,
          participantIds: [...original.participantIds],
          ...(original.alcohol
            ? {
                alcohol: {
                  unitPrice: original.alcohol.unitPrice,
                  quantity: original.alcohol.quantity,
                  drinkerIds: [...original.alcohol.drinkerIds],
                },
              }
            : {}),
        };

        set((state) => {
          const idx = state.sessions.findIndex((s) => s.id === id);
          const next = [...state.sessions];
          next.splice(idx + 1, 0, newSession);
          return { sessions: next };
        });

        return newSession;
      },

      toggleParticipant: (sessionId, memberId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const has = s.participantIds.includes(memberId);
            return {
              ...s,
              participantIds: has
                ? s.participantIds.filter((id) => id !== memberId)
                : [...s.participantIds, memberId],
            };
          }),
        }));
      },

      setAlcohol: (sessionId, alcohol) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, alcohol } : s,
          ),
        }));
      },

      removeMemberFromSessions: (memberId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            const participantIds = s.participantIds.filter((id) => id !== memberId);
            const alcohol = s.alcohol
              ? {
                  ...s.alcohol,
                  drinkerIds: s.alcohol.drinkerIds.filter((id) => id !== memberId),
                }
              : undefined;
            const payerId = s.payerId === memberId
              ? (participantIds[0] ?? s.payerId)
              : s.payerId;
            return { ...s, participantIds, alcohol, payerId };
          }),
        }));
      },

      reset: () => {
        set({ sessions: [] });
      },
    }),
    { name: 'ggini-session-storage' },
  ),
);
