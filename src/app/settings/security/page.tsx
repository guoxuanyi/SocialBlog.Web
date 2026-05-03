'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { changeMyPassword } from '@/shared/api';
import { routes } from '@/lib/routes';
import { useToast } from '@/components/ToastProvider';

export default function SecurityPage() {
  const router = useRouter();
  const { state } = useAuth();
  const toast = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status !== 'authenticated') router.replace(routes.auth.login());
  }, [router, state.status]);

  async function submit() {
    const o = oldPassword;
    const n = newPassword;
    if (!o || !n) {
      toast.push({ kind: 'error', message: '请填写旧密码与新密码' });
      return;
    }
    setSubmitting(true);
    try {
      await changeMyPassword({ oldPassword: o, newPassword: n });
      toast.push({ kind: 'success', message: '密码已更新' });
      setOldPassword('');
      setNewPassword('');
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Security" mode="detail" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-900">Old password</label>
              <input
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                type="password"
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">New password</label>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                autoComplete="new-password"
              />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="w-full px-4 py-3 rounded-xl bg-orange-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
            >
              Update password
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
