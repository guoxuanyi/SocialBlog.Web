'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider } from '@/components/ToastProvider';
import { PreferencesProvider } from '@/features/preferences/PreferencesProvider';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { routes } from '@/lib/routes';

function NavHistoryTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const href = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const current = window.sessionStorage.getItem('sb:nav:current') ?? '';
      if (current !== href) {
        window.sessionStorage.setItem('sb:nav:previous', current);
        window.sessionStorage.setItem('sb:nav:current', href);
      }
    } catch {}
  }, [pathname, searchKey]);

  return null;
}

type AuthRequiredDetail = {
  reason?: string;
  next?: string;
};

function AuthRequiredPrompt() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<string>('');

  useEffect(() => {
    const onRequired = (evt: Event) => {
      const e = evt as CustomEvent<AuthRequiredDetail>;
      const n = (e.detail?.next ?? '').trim();
      setNext(n);
      setOpen(true);
    };
    window.addEventListener('auth:required', onRequired as EventListener);
    return () => window.removeEventListener('auth:required', onRequired as EventListener);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-black/40 p-4 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="text-base font-extrabold text-gray-900">需要重新登录</div>
          <div className="mt-2 text-sm text-gray-600">登录已过期或未登录，继续操作需要重新登录。</div>
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => {
                const href = next || routes.home();
                router.push(`${routes.auth.login()}?next=${encodeURIComponent(href)}`);
                setOpen(false);
              }}
              className="w-full h-11 rounded-2xl bg-gray-900 text-white font-semibold hover:bg-gray-800 active:scale-[0.99] transition-transform"
            >
              去登录
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full h-11 rounded-2xl border border-gray-200 bg-white text-gray-800 font-semibold hover:bg-gray-50 active:scale-[0.99] transition-transform"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <ToastProvider>
        <AuthProvider>
          <NavHistoryTracker />
          <AuthRequiredPrompt />
          {children}
        </AuthProvider>
      </ToastProvider>
    </PreferencesProvider>
  );
}
