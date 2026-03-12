'use client';

import { type ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  return (
    <dialog
      ref={dialogRef}
      className="
        m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-none
        bg-surface-elevated p-0 shadow-xl
        backdrop:bg-black/40 backdrop:backdrop-blur-sm
        open:animate-in open:fade-in open:zoom-in-95
      "
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-label={title}
    >
      <div className="p-5">
        {title && (
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            {title}
          </h2>
        )}
        {children}
      </div>
    </dialog>
  );
}
