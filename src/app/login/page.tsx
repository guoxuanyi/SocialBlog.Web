'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import Header from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import { routes } from '@/lib/routes';

function LoginInner() {
  const { login, state } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setError('请输入用户名和密码');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(u, p);
      const target: Route = next && next.startsWith('/') ? (next as unknown as Route) : routes.home();
      router.replace(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Login" mode="detail" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-2xl font-extrabold text-gray-900">Welcome back</div>
          <div className="mt-2 text-sm text-gray-500">登录后即可发布、点赞、评论。</div>

          {error ? (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-900">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="admin"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="button"
              disabled={submitting || state.status === 'loading'}
              onClick={submit}
              className="w-full px-4 py-3 rounded-xl bg-orange-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
            >
              Sign in
            </button>

            <div className="text-sm text-gray-600 text-center">
              没有账号？{' '}
              <Link href={routes.auth.register()} className="text-orange-600 font-semibold hover:text-orange-700">
                去注册
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
