import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToastStore } from '../toast-store';

describe('useToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store to empty state
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addToast', () => {
    it('adds a toast with auto-generated ID', () => {
      useToastStore.getState().addToast('Hello');

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Hello');
      expect(toasts[0].id).toMatch(/^toast-\d+$/);
    });

    it('default type is success', () => {
      useToastStore.getState().addToast('Default type');

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].type).toBe('success');
    });

    it('can specify error type', () => {
      useToastStore.getState().addToast('Error message', 'error');

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].type).toBe('error');
    });

    it('can specify info type', () => {
      useToastStore.getState().addToast('Info message', 'info');

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].type).toBe('info');
    });

    it('keeps max 3 toasts (slice(-2) + new = 3)', () => {
      useToastStore.getState().addToast('First');
      useToastStore.getState().addToast('Second');
      useToastStore.getState().addToast('Third');

      expect(useToastStore.getState().toasts).toHaveLength(3);

      // Adding a 4th should keep only the last 2 + the new one = 3
      useToastStore.getState().addToast('Fourth');

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(3);
      expect(toasts[0].message).toBe('Second');
      expect(toasts[1].message).toBe('Third');
      expect(toasts[2].message).toBe('Fourth');
    });

    it('toast counter increments (IDs are unique)', () => {
      useToastStore.getState().addToast('A');
      useToastStore.getState().addToast('B');

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].id).not.toBe(toasts[1].id);
    });

    it('multiple rapid addToast calls work correctly', () => {
      useToastStore.getState().addToast('Rapid 1');
      useToastStore.getState().addToast('Rapid 2');
      useToastStore.getState().addToast('Rapid 3');

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(3);
      expect(toasts.map((t) => t.message)).toEqual([
        'Rapid 1',
        'Rapid 2',
        'Rapid 3',
      ]);
    });
  });

  describe('removeToast', () => {
    it('removes a specific toast by ID', () => {
      useToastStore.getState().addToast('To keep');
      useToastStore.getState().addToast('To remove');

      const toasts = useToastStore.getState().toasts;
      const idToRemove = toasts[1].id;

      useToastStore.getState().removeToast(idToRemove);

      const remaining = useToastStore.getState().toasts;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].message).toBe('To keep');
    });

    it('does nothing when removing a non-existent ID', () => {
      useToastStore.getState().addToast('Existing');

      useToastStore.getState().removeToast('non-existent-id');

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

  describe('auto-removal', () => {
    it('auto-removes toast after 2500ms', () => {
      useToastStore.getState().addToast('Auto remove');

      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(2499);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('auto-removes each toast independently', () => {
      useToastStore.getState().addToast('First');

      vi.advanceTimersByTime(1000);

      useToastStore.getState().addToast('Second');

      // At 2500ms, First should be removed
      vi.advanceTimersByTime(1500);
      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Second');

      // At 3500ms, Second should be removed
      vi.advanceTimersByTime(1000);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });
});
