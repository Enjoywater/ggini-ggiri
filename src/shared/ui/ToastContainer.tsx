'use client';

import { useToastStore } from '@/shared/lib/toast-store';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

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
    </div>,
    document.body,
  );
}
