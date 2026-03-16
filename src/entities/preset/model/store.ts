import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MemberPreset } from '@/shared/types';
import { createId } from '@/shared/lib/nanoid';

interface PresetState {
  presets: MemberPreset[];
  addPreset: (name: string, memberNames: string[]) => MemberPreset;
  removePreset: (id: string) => void;
  updatePreset: (id: string, params: Partial<Omit<MemberPreset, 'id'>>) => void;
  getPreset: (id: string) => MemberPreset | undefined;
  reset: () => void;
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      presets: [],

      addPreset: (name, memberNames) => {
        const preset: MemberPreset = { id: createId(), name, memberNames };
        set((state) => ({ presets: [...state.presets, preset] }));
        return preset;
      },

      removePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        }));
      },

      updatePreset: (id, params) => {
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, ...params } : p,
          ),
        }));
      },

      getPreset: (id) => {
        return get().presets.find((p) => p.id === id);
      },

      reset: () => {
        set({ presets: [] });
      },
    }),
    { name: 'ggini-preset-storage' },
  ),
);
