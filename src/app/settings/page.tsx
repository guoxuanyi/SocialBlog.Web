'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { routes } from '@/lib/routes';

export default function SettingsPage() {
  const router = useRouter();
  const { state, logout } = useAuth();

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status !== 'authenticated') router.replace(routes.auth.login());
  }, [router, state.status]);

  const name = state.status === 'authenticated' ? (state.user.displayName ?? state.user.username) : '';

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Profile" mode="detail" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-extrabold">
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div className="mt-3 text-lg font-extrabold text-gray-900">{name}</div>
          {state.status === 'authenticated' ? <div className="mt-1 text-sm text-gray-500">@{state.user.username}</div> : null}
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-[11px] text-gray-400 mb-2 px-2 font-semibold tracking-widest uppercase">Account</div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
              <Link href={routes.settings.profile()} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <span className="text-lg font-black">P</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Edit profile</div>
                </div>
                <div className="text-gray-300">›</div>
              </Link>
              <Link href={routes.settings.security()} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <span className="text-lg font-black">S</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Security</div>
                </div>
                <div className="text-gray-300">›</div>
              </Link>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-gray-400 mb-2 px-2 font-semibold tracking-widest uppercase">Session</div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.replace(routes.home());
                }}
                className="w-full text-left flex items-center justify-between px-4 py-4 hover:bg-red-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <span className="text-lg font-black">×</span>
                  </div>
                  <div className="text-sm font-semibold text-red-600">Logout</div>
                </div>
                <div className="text-red-300">›</div>
              </button>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
