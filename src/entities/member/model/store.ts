import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Member } from '@/shared/types';
import { createId } from '@/shared/lib/nanoid';

interface MemberState {
  members: Member[];
  addMember: (name: string) => Member;
  updateMember: (id: string, name: string) => void;
  removeMember: (id: string) => void;
  getMember: (id: string) => Member | undefined;
  reset: () => void;
}

export const useMemberStore = create<MemberState>()(
  persist(
    (set, get) => ({
      members: [],

      addMember: (name) => {
        const member: Member = { id: createId(), name };
        set((state) => ({ members: [...state.members, member] }));
        return member;
      },

      updateMember: (id, name) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, name } : m,
          ),
        }));
      },

      removeMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        }));
      },

      getMember: (id) => {
        return get().members.find((m) => m.id === id);
      },

      reset: () => {
        set({ members: [] });
      },
    }),
    { name: 'ggini-member-storage' },
  ),
);
