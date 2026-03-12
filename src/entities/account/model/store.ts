import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserAccount } from '@/shared/types';

interface AccountState {
  account: UserAccount | null;
  setAccount: (account: UserAccount) => void;
  clearAccount: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      account: null,

      setAccount: (account) => {
        set({ account });
      },

      clearAccount: () => {
        set({ account: null });
      },
    }),
    { name: 'ggini-account-storage' },
  ),
);
