'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { routes } from '@/lib/routes';
import { useAuth } from '@/components/AuthProvider';
import { useT } from '@/features/preferences/PreferencesProvider';

type HeaderProps = {
  title?: string;
  mode?: 'discover' | 'detail' | 'profile';
  showBack?: boolean;
  backHref?: Route;
  onBack?: () => void;
  showSearch?: boolean;
  showPublish?: boolean;
  publishDisabled?: boolean;
  onPublish?: () => void;
};

export default function Header({
  title,
  mode = 'discover',
  showBack = false,
  backHref,
  onBack,
  showSearch = false,
  showPublish = false,
  publishDisabled = false,
  onPublish,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useAuth();
  const t = useT();

  const avatarUrl = state.status === 'authenticated' ? (state.user.avatarUrl ?? '').trim() : '';
  const showAvatarImage = Boolean(avatarUrl) && !avatarUrl.startsWith('data:video/');

  const brand = (
    <div className="inline-flex items-center gap-2" role="img" aria-label="spectare">
      <span className="w-9 h-9 rounded-xl bg-orange-500 text-white font-extrabold flex items-center justify-center shadow-sm">
        S
      </span>
      <span className="text-sm font-extrabold tracking-tight text-gray-900">Spectare</span>
    </div>
  );

  const menuItems = useMemo(() => {
    const isHome = pathname === '/';
    const isExplore = pathname === '/search' || pathname === '/explore';
    const isInbox = pathname === '/activity' || pathname === '/inbox';

    return [
      {
        key: 'home',
        label: t('nav_home'),
        href: routes.home(),
        active: isHome,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        ),
      },
      {
        key: 'explore',
        label: t('nav_explore'),
        href: routes.explore(),
        active: isExplore,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        ),
      },
      {
        key: 'inbox',
        label: t('nav_inbox'),
        href: routes.inbox(),
        active: isInbox,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        ),
      },
    ];
  }, [pathname, t]);

  const left = showBack
    ? backHref
      ? (
          <Link
            href={backHref}
            className="inline-flex items-center justify-center w-10 h-10 -ml-2 text-gray-700 hover:text-orange-500 transition-colors"
            aria-label={t('action_back')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
        )
      : (
          <button
            type="button"
            onClick={() => (onBack ? onBack() : router.back())}
            className="inline-flex items-center justify-center w-10 h-10 -ml-2 text-gray-700 hover:text-orange-500 transition-colors"
            aria-label={t('action_back')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        )
    : null;

  const profileHref = state.status === 'authenticated' ? routes.profile(state.user.id) : routes.auth.login();

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-5xl xl:max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          {left}
          {brand}
          {mode !== 'discover' ? (
            <div className="text-gray-900 font-semibold max-w-[12rem] md:max-w-[16rem] truncate">{title ?? ''}</div>
          ) : null}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-2">
            {menuItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`group inline-flex items-center justify-center w-11 h-11 rounded-full border transition-all ${
                  item.active ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">{item.label}</span>
                <span className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95">{item.icon}</span>
              </Link>
            ))}
          </nav>

          <Link
            href={state.status === 'authenticated' ? routes.settings.index() : routes.auth.login()}
            title={t('settings')}
            aria-label={t('settings')}
            className={`group inline-flex items-center justify-center w-10 h-10 rounded-full border transition-all ${
              pathname.startsWith('/settings')
                ? 'bg-orange-50 border-orange-200 text-orange-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="transition-transform duration-200 group-hover:rotate-6 group-hover:scale-110 group-active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.094c.55 0 1.02.398 1.11.94l.149.894c.07.424.37.77.764.93.394.16.848.118 1.171-.11l.75-.53a1.125 1.125 0 0 1 1.41.14l.773.773c.39.39.44 1.002.14 1.41l-.53.75c-.228.323-.27.777-.11 1.17.16.395.506.695.93.765l.894.149c.542.09.94.56.94 1.11v1.094c0 .55-.398 1.02-.94 1.11l-.894.149c-.424.07-.77.37-.93.764-.16.394-.118.848.11 1.171l.53.75c.3.408.25 1.02-.14 1.41l-.773.773a1.125 1.125 0 0 1-1.41.14l-.75-.53c-.323-.228-.777-.27-1.17-.11-.395.16-.695.506-.765.93l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.02-.398-1.11-.94l-.149-.894a1.125 1.125 0 0 0-.765-.93c-.393-.16-.847-.118-1.17.11l-.75.53a1.125 1.125 0 0 1-1.41-.14l-.773-.773a1.125 1.125 0 0 1-.14-1.41l.53-.75c.228-.323.27-.777.11-1.17a1.125 1.125 0 0 0-.93-.765l-.894-.149a1.125 1.125 0 0 1-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.77-.37.93-.764.16-.394.118-.848-.11-1.171l-.53-.75a1.125 1.125 0 0 1 .14-1.41l.773-.773a1.125 1.125 0 0 1 1.41-.14l.75.53c.323.228.777.27 1.17.11.395-.16.695-.506.765-.93l.149-.894Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </span>
          </Link>

          {showSearch ? (
            <Link
              href={routes.explore()}
              className="group inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all"
              aria-label={t('action_search')}
              title={t('action_search')}
            >
              <span className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
            </Link>
          ) : null}

          {showPublish ? (
            <button
              type="button"
              disabled={publishDisabled}
              onClick={onPublish}
              className="group inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-600 text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors active:scale-95"
              aria-label={t('action_publish')}
              title={t('action_publish')}
            >
              <span className="transition-transform duration-200 group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L6 12Zm0 0h7.5" />
                </svg>
              </span>
            </button>
          ) : null}

          <Link
            href={profileHref}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors overflow-hidden"
            aria-label={t('nav_profile')}
            title={t('nav_profile')}
          >
            {state.status === 'authenticated' ? (
              showAvatarImage ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-700 font-semibold">{(state.user.displayName ?? state.user.username ?? 'U').charAt(0).toUpperCase()}</span>
              )
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
