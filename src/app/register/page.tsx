'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { registerUser } from '@/shared/api';
import { routes } from '@/lib/routes';
import { useToast } from '@/components/ToastProvider';
import { useT } from '@/features/preferences/PreferencesProvider';

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const u = username.trim();
    const e = email.trim();
    const p = password;
    if (!u || !e || !p) {
      toast.push({ kind: 'error', message: t('error_enter_register_fields') });
      return;
    }
    setSubmitting(true);
    try {
      await registerUser({
        username: u,
        email: e,
        password: p,
        displayName: displayName.trim() || undefined,
      });
      toast.push({ kind: 'success', message: t('success_register_login') });
      router.replace(routes.auth.login());
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title={t('auth_register')} mode="detail" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-2xl font-extrabold text-gray-900">{t('auth_create_account')}</div>
          <div className="mt-2 text-sm text-gray-500">{t('auth_register_hint')}</div>

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
              <label className="text-sm font-semibold text-gray-900">{t('field_email')}</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder={t('placeholder_email')}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">{t('field_display_name')}</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder={t('placeholder_display_name')}
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
                autoComplete="new-password"
              />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="w-full px-4 py-3 rounded-xl bg-orange-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
            >
              {t('action_sign_up')}
            </button>

            <div className="text-sm text-gray-600 text-center">
              {t('auth_has_account')}{' '}
              <Link href={routes.auth.login()} className="text-orange-600 font-semibold hover:text-orange-700">
                {t('auth_go_login')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
