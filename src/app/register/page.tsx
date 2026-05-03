'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { registerUser, toUserErrorMessage } from '@/lib/api';
import { routes } from '@/lib/routes';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    const u = username.trim();
    const e = email.trim();
    const p = password;
    if (!u || !e || !p) {
      setError('请填写用户名、邮箱与密码');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await registerUser({
        username: u,
        email: e,
        password: p,
        displayName: displayName.trim() || undefined,
      });
      setSuccess('注册成功，请登录');
      router.replace(routes.auth.login());
    } catch (err) {
      setError(toUserErrorMessage(err, '注册失败'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Register" mode="detail" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-2xl font-extrabold text-gray-900">Create account</div>
          <div className="mt-2 text-sm text-gray-500">注册后可同步个人资料与内容。</div>

          {error ? (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {success ? (
            <div className="mt-4 bg-green-50 border border-green-100 rounded-2xl p-4 text-sm text-green-700">{success}</div>
          ) : null}

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-900">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="yourname"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="Alex Rivera"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="至少 6 位"
                autoComplete="new-password"
              />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="w-full px-4 py-3 rounded-xl bg-orange-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
            >
              Create account
            </button>

            <div className="text-sm text-gray-600 text-center">
              已有账号？{' '}
              <Link href={routes.auth.login()} className="text-orange-600 font-semibold hover:text-orange-700">
                去登录
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
