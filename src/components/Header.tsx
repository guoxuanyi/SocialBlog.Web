'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { routes } from '@/lib/routes';
import { useAuth } from '@/components/AuthProvider';

type HeaderProps = {
  title?: string;
  mode?: 'discover' | 'detail' | 'profile';
  showBack?: boolean;
  backHref?: Route;
  showSearch?: boolean;
  showPublish?: boolean;
  publishDisabled?: boolean;
  onPublish?: () => void;
};

export default function Header({
  title = 'Discover',
  mode = 'discover',
  showBack = false,
  backHref,
  showSearch = true,
  showPublish = false,
  publishDisabled = false,
  onPublish,
}: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { state } = useAuth();

  const menuItems = useMemo(
    () => [
      { label: 'Home', href: routes.home() },
      { label: 'Explore', href: routes.explore() },
      { label: 'Inbox', href: routes.inbox() },
      { label: 'Profile', href: state.status === 'authenticated' ? routes.profile(state.user.id) : routes.auth.login() },
    ],
    [state]
  );

  const left = showBack ? (
    backHref ? (
      <Link
        href={backHref}
        className="inline-flex items-center justify-center w-10 h-10 -ml-2 text-gray-700 hover:text-orange-500 transition-colors"
        aria-label="Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center justify-center w-10 h-10 -ml-2 text-gray-700 hover:text-orange-500 transition-colors"
        aria-label="Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
    )
  ) : (
    <button
      type="button"
      onClick={() => setMenuOpen((v) => !v)}
      className="inline-flex items-center justify-center w-10 h-10 -ml-2 text-gray-700 hover:text-orange-500 transition-colors active:scale-95 md:hidden"
      aria-label="Quick menu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h.008v.008H6V12Zm6 0h.008v.008H12V12Zm6 0h.008v.008H18V12Z" />
      </svg>
    </button>
  );

  const right = (
    <div className="flex items-center gap-3">
      {showPublish ? (
        <button
          type="button"
          disabled={publishDisabled}
          onClick={onPublish}
          className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors active:scale-[0.98]"
        >
          Publish
        </button>
      ) : null}

      {showSearch ? (
        <Link
          href={routes.explore()}
          className="inline-flex items-center justify-center w-10 h-10 text-gray-700 hover:text-orange-500 transition-colors"
          aria-label="Search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </Link>
      ) : null}

      {state.status === 'authenticated' ? (
        <Link
          href={routes.profile(state.user.id)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors overflow-hidden"
          aria-label="Profile"
        >
          <span className="text-gray-700 font-semibold">{(state.user.displayName ?? state.user.username ?? 'U').charAt(0).toUpperCase()}</span>
        </Link>
      ) : null}
    </div>
  );

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-5xl xl:max-w-6xl mx-auto px-4 h-14 flex items-center gap-3 relative">
        <div className="shrink-0 flex items-center gap-2">
          {left}
          <div className="hidden md:block">
            {mode === 'discover' ? (
              <Link href={routes.home()} className="text-orange-600 font-extrabold tracking-tight">
                {title}
              </Link>
            ) : (
              <div className="text-gray-900 font-semibold">{title}</div>
            )}
          </div>
        </div>

        <div className="md:hidden absolute left-1/2 -translate-x-1/2">
          {mode === 'discover' ? (
            <Link href={routes.home()} className="text-orange-600 font-extrabold tracking-tight">
              {title}
            </Link>
          ) : (
            <div className="text-gray-900 font-semibold">{title}</div>
          )}
        </div>

        <nav className="hidden md:flex flex-1 items-center gap-2 overflow-x-auto hide-scrollbar">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="shrink-0 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform"
            >
              {item.label}
            </Link>
          ))}
          {state.status === 'authenticated' ? (
            <Link
              href={routes.settings.index()}
              className="shrink-0 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform"
            >
              Settings
            </Link>
          ) : null}
        </nav>

        <div className="shrink-0 flex items-center gap-2">
          {right}
          {state.status !== 'authenticated' ? (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href={routes.auth.login()}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] transition-transform"
              >
                Login
              </Link>
              <Link
                href={routes.auth.register()}
                className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 active:scale-[0.98] transition-transform"
              >
                Register
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div className={`fixed inset-0 z-50 md:hidden ${menuOpen ? '' : 'pointer-events-none'}`}>
        <button
          type="button"
          className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`absolute left-0 right-0 top-14 transition-all duration-200 ${menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
          aria-hidden={!menuOpen}
        >
          <div className="max-w-5xl xl:max-w-6xl mx-auto px-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-3 soft-pop">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-600">
                  {state.status === 'authenticated'
                    ? `Signed in as ${state.user.displayName ?? state.user.username}`
                    : 'Not signed in'}
                </div>
                {state.status === 'authenticated' ? (
                  <Link
                    href={routes.settings.index()}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] transition-transform"
                  >
                    Settings
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href={routes.auth.login()}
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] transition-transform"
                    >
                      Login
                    </Link>
                    <Link
                      href={routes.auth.register()}
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 active:scale-[0.98] transition-transform"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
