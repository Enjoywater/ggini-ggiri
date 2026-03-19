import { useCallback, useState } from 'react';

type ModalState<T = undefined> = {
  open: boolean;
  data: T | undefined;
};

export function useModalManager<K extends string>(keys: readonly K[]) {
  const [modals, setModals] = useState<Record<K, ModalState<unknown>>>(() => {
    const initial = {} as Record<K, ModalState<unknown>>;
    for (const key of keys) {
      initial[key] = { open: false, data: undefined };
    }
    return initial;
  });

  const open = useCallback(<T,>(key: K, data?: T) => {
    setModals(prev => ({ ...prev, [key]: { open: true, data } }));
  }, []);

  const close = useCallback((key: K) => {
    setModals(prev => ({ ...prev, [key]: { open: false, data: undefined } }));
  }, []);

  const isOpen = useCallback((key: K) => modals[key].open, [modals]);

  const getData = useCallback(<T,>(key: K) => modals[key].data as T | undefined, [modals]);

  return { open, close, isOpen, getData };
}
