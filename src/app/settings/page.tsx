'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { routes } from '@/lib/routes';
import { usePreferences, useT } from '@/features/preferences/PreferencesProvider';

export default function SettingsPage() {
  const router = useRouter();
  const { state, logout } = useAuth();
  const { preferences, setLanguage, setTheme } = usePreferences();
  const t = useT();

  const isAuthenticated = state.status === 'authenticated';

  const name = isAuthenticated ? (state.user.displayName ?? state.user.username) : t('guest');

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title={t('settings')} mode="detail" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-extrabold">
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div className="mt-3 text-lg font-extrabold text-gray-900">{name}</div>
          {isAuthenticated ? <div className="mt-1 text-sm text-gray-500">@{state.user.username}</div> : null}
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-[11px] text-gray-400 mb-2 px-2 font-semibold tracking-widest uppercase">{t('appearance')}</div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t('theme')}</div>
                    <div className="text-xs text-gray-500">{t('theme_options')}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`h-10 px-4 rounded-full border text-sm font-semibold transition-colors ${
                      preferences.theme === 'light'
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('theme_light')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`h-10 px-4 rounded-full border text-sm font-semibold transition-colors ${
                      preferences.theme === 'dark'
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('theme_dark')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('ocean')}
                    className={`h-10 px-4 rounded-full border text-sm font-semibold transition-colors ${
                      preferences.theme === 'ocean'
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('theme_ocean')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('sunset')}
                    className={`h-10 px-4 rounded-full border text-sm font-semibold transition-colors ${
                      preferences.theme === 'sunset'
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('theme_sunset')}
                  </button>
                </div>
              </div>
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t('language')}</div>
                  <div className="text-xs text-gray-500">{t('ui_language')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('zh')}
                    className={`h-10 px-4 rounded-full border text-sm font-semibold transition-colors ${
                      preferences.language === 'zh'
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('language_zh')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`h-10 px-4 rounded-full border text-sm font-semibold transition-colors ${
                      preferences.language === 'en'
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('language_en')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isAuthenticated ? (
            <>
              <div>
                <div className="text-[11px] text-gray-400 mb-2 px-2 font-semibold tracking-widest uppercase">{t('account')}</div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                  <Link href={routes.settings.security()} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                        <span className="text-lg font-black">S</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">{t('security')}</div>
                    </div>
                    <div className="text-gray-300">›</div>
                  </Link>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-gray-400 mb-2 px-2 font-semibold tracking-widest uppercase">{t('session')}</div>
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
                      <div className="text-sm font-semibold text-red-600">{t('logout')}</div>
                    </div>
                    <div className="text-red-300">›</div>
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
