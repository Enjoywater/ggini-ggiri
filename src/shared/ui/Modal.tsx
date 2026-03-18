'use client';

import { type ReactNode, useCallback, useEffect, useId, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uniqueId = useId();
  const titleId = title ? `modal-title-${uniqueId}` : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDialogElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="
        m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-none
        bg-surface-elevated p-0 shadow-xl
        backdrop:bg-black/40 backdrop:backdrop-blur-sm
        open:animate-in open:fade-in open:zoom-in-95
      "
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="flex max-h-[70dvh] flex-col p-5">
        {/* 헤더 */}
        <div className="mb-3 flex items-start justify-between">
          {title && (
            <h2
              id={titleId}
              className="pr-8 text-lg font-semibold text-text-primary"
            >
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="-m-1.5 ml-auto inline-flex items-center justify-center rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
            aria-label="닫기"
          >
            &#x2715;
          </button>
        </div>
        {/* 스크롤 콘텐츠 */}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}
