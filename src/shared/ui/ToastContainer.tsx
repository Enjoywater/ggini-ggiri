'use client';

import { useToastStore } from '@/shared/lib/toast-store';
import { useUndoStore } from '@/shared/lib/undo-store';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const typeStyles: Record<string, string> = {
  success: 'bg-pastel-mint border-pastel-mint-dark text-text-primary',
  error: 'bg-pastel-coral border-pastel-coral-dark text-text-primary',
  info: 'bg-pastel-sky border-pastel-sky-dark text-text-primary',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const undoPending = useUndoStore((s) => s.pending);
  const executeUndo = useUndoStore((s) => s.executeUndo);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || (toasts.length === 0 && !undoPending)) return null;

  return createPortal(
    <div
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="region"
      aria-label="알림"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto animate-toast-in rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${typeStyles[toast.type] ?? typeStyles.info}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-center justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              className="text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => removeToast(toast.id)}
              aria-label="알림 닫기"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      {undoPending && (
        <div
          className="pointer-events-auto animate-toast-in rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm shadow-lg"
          role="status"
          aria-live="assertive"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--color-text-primary)] font-medium">{undoPending.label}</span>
            <button
              type="button"
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1 font-bold text-white transition-colors hover:opacity-90"
              onClick={executeUndo}
              aria-label="삭제 실행취소"
            >
              실행취소
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
