import { create } from 'zustand';

export interface UndoEntry {
  id: string;
  label: string;
  restore: () => void;
  expiresAt: number;
}

const UNDO_TIMEOUT = 5000;

interface UndoState {
  pending: UndoEntry | null;
  pushUndo: (label: string, restore: () => void) => void;
  executeUndo: () => void;
  clearUndo: () => void;
}

let undoTimer: ReturnType<typeof setTimeout> | null = null;

export const useUndoStore = create<UndoState>((set, get) => ({
  pending: null,

  pushUndo: (label, restore) => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }

    const id = `undo-${Date.now()}`;
    set({
      pending: { id, label, restore, expiresAt: Date.now() + UNDO_TIMEOUT },
    });

    undoTimer = setTimeout(() => {
      undoTimer = null;
      if (get().pending?.id === id) {
        set({ pending: null });
      }
    }, UNDO_TIMEOUT);
  },

  executeUndo: () => {
    const entry = get().pending;
    if (!entry) return;

    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }

    entry.restore();
    set({ pending: null });
  },

  clearUndo: () => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
    set({ pending: null });
  },
}));
