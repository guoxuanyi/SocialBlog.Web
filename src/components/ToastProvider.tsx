'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type ToastKind = 'info' | 'success' | 'error';

type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastInput = {
  kind?: ToastKind;
  message: string;
  durationMs?: number;
};

type ToastContextValue = {
  push: (toast: ToastInput) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function kindClasses(kind: ToastKind): string {
  if (kind === 'success') return 'bg-emerald-600 text-white';
  if (kind === 'error') return 'bg-red-600 text-white';
  return 'bg-gray-900 text-white';
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef(new Map<string, number>());
  const lastToastRef = useRef<{ key: string; at: number } | null>(null);

  const remove = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) window.clearTimeout(t);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const push = useCallback(
    ({ kind = 'info', message, durationMs = 4000 }: ToastInput) => {
      const now = Date.now();
      const key = `${kind}:${message}`;
      const last = lastToastRef.current;
      if (last && last.key === key && now - last.at < 1200) return;
      lastToastRef.current = { key, at: now };
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast: Toast = { id, kind, message };
      setToasts((prev) => [...prev, toast].slice(-3));
      const timer = window.setTimeout(() => remove(id), durationMs);
      timersRef.current.set(id, timer);
    },
    [remove]
  );

  useEffect(() => {
    const onToast = (evt: Event) => {
      const e = evt as CustomEvent<ToastInput>;
      const msg = (e.detail?.message ?? '').trim();
      if (!msg) return;
      push({ kind: e.detail?.kind, message: msg, durationMs: e.detail?.durationMs });
    };
    window.addEventListener('app:toast', onToast as EventListener);
    return () => window.removeEventListener('app:toast', onToast as EventListener);
  }, [push]);

  const value = useMemo<ToastContextValue>(() => ({ push, clear }), [push, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
        <div className="w-full max-w-md space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto w-full rounded-2xl shadow-lg border border-white/10 px-4 py-3 ${kindClasses(t.kind)}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-5">{t.message}</p>
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={() => remove(t.id)}
                >
                  关闭
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider is missing');
  return ctx;
}
