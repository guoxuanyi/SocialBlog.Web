'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import Header from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import { routes } from '@/lib/routes';
import { useToast } from '@/components/ToastProvider';
import { useT } from '@/features/preferences/PreferencesProvider';

function LoginInner() {
  const { login, state } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const t = useT();
  const next = searchParams.get('next');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      toast.push({ kind: 'error', message: t('error_enter_username_password') });
      return;
    }
    setSubmitting(true);
    try {
      await login(u, p);
      const target: Route = next && next.startsWith('/') ? (next as unknown as Route) : routes.home();
      router.replace(target);
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title={t('auth_login')} mode="detail" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-2xl font-extrabold text-gray-900">{t('auth_welcome_back')}</div>
          <div className="mt-2 text-sm text-gray-500">{t('auth_login_hint')}</div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-900">{t('field_username')}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder={t('placeholder_username')}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">{t('field_password')}</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder={t('placeholder_password')}
                autoComplete="current-password"
              />
            </div>

            <button
              type="button"
              disabled={submitting || state.status === 'loading'}
              onClick={submit}
              className="w-full px-4 py-3 rounded-xl bg-orange-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
            >
              {t('action_sign_in')}
            </button>

            <div className="text-sm text-gray-600 text-center">
              {t('auth_no_account')}{' '}
              <Link href={routes.auth.register()} className="text-orange-600 font-semibold hover:text-orange-700">
                {t('auth_go_register')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
