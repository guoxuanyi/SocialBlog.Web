'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { routes } from '@/lib/routes';
import { useAuth } from '@/components/AuthProvider';
import { useT } from '@/features/preferences/PreferencesProvider';

export default function BottomNav() {
  const pathname = usePathname();
  const { state } = useAuth();
  const t = useT();
  const [showTop, setShowTop] = useState(false);
  const isHome = pathname === '/';
  const isExplore = pathname === '/search' || pathname === '/explore';
  const isNewPost = pathname === '/posts/new';
  const isPostDetail = pathname.startsWith('/posts/') && !isNewPost;
  const isInbox = pathname === '/activity' || pathname === '/inbox';
  const isProfile = pathname.startsWith('/profile');
  const showRefresh = isHome || isExplore || isProfile;
  const profileHref =
    state.status === 'authenticated' ? routes.profile(state.user.id) : routes.auth.login();

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setShowTop(y > 260);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToTopElastic() {
    if (typeof window === 'undefined') return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reducedMotion) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const startY = window.scrollY;
    const endY = 0;
    const delta = endY - startY;
    const durationMs = 620;
    const start = performance.now();

    const easeOutBack = (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / durationMs));
      const y = startY + delta * easeOutBack(p);
      window.scrollTo(0, y);
      if (p < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50">
        <Link
          href={routes.home()}
          className={`flex flex-col items-center ${isHome ? 'text-orange-500' : 'text-gray-400 hover:text-gray-900'} transition-colors active:scale-95`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-[10px] mt-1 font-medium">{t('nav_home')}</span>
        </Link>
        
        <Link
          href={routes.explore()}
          className={`flex flex-col items-center ${isExplore ? 'text-orange-500' : 'text-gray-400 hover:text-gray-900'} transition-colors active:scale-95`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <span className="text-[10px] mt-1 font-medium">{t('nav_explore')}</span>
        </Link>

        {isNewPost ? (
          <div className="w-12 h-12 -mt-6" />
        ) : (
          <Link href={routes.create()} className="flex items-center justify-center -mt-6 active:scale-95 transition-transform" aria-label={t('action_create')} title={t('action_create')}>
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/30 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </Link>
        )}

        <Link
          href={routes.inbox()}
          className={`flex flex-col items-center ${isInbox ? 'text-orange-500' : 'text-gray-400 hover:text-gray-900'} transition-colors active:scale-95`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="text-[10px] mt-1 font-medium">{t('nav_inbox')}</span>
        </Link>

        <Link
          href={profileHref}
          className={`flex flex-col items-center ${isProfile ? 'text-orange-500' : 'text-gray-400 hover:text-gray-900'} transition-colors active:scale-95`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <span className="text-[10px] mt-1 font-medium">{t('nav_profile')}</span>
        </Link>
      </div>

      <div className="fixed right-4 bottom-20 md:right-6 md:bottom-24 z-50">
        {showRefresh ? (
          <button
            type="button"
            onClick={() => {
              if (typeof window === 'undefined') return;
              const sp = new URLSearchParams(window.location.search);
              const authed = state.status === 'authenticated';
              const authKey = authed ? state.user.id : '';

              if (pathname === '/') {
                const tab = sp.get('tab') === 'following' ? 'following' : 'forYou';
                const category = (sp.get('category') ?? 'Trending').trim() || 'Trending';
                const key = `${tab}|${category}|${state.status}|${authKey}`;
                window.dispatchEvent(new CustomEvent('app:refresh-feed', { detail: { key } }));
                return;
              }

              if (pathname === '/search' || pathname === '/explore') {
                const q = (sp.get('q') ?? '').trim();
                window.dispatchEvent(new CustomEvent('app:refresh-search', { detail: { key: q || '*' } }));
                return;
              }

              if (pathname.startsWith('/profile/')) {
                const tab = (sp.get('tab') ?? 'Published').trim();
                const username = decodeURIComponent(pathname.slice('/profile/'.length));
                const key = `${username}|${tab}|${state.status}|${authKey}`;
                window.dispatchEvent(new CustomEvent('app:refresh-profile', { detail: { key } }));
                return;
              }
            }}
            className="group w-14 h-14 rounded-full bg-white text-gray-800 border border-gray-200 shadow-lg transition-transform active:scale-95 flex items-center justify-center"
            aria-label={t('action_refresh')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-6 h-6 transition-transform duration-200 group-hover:rotate-45 group-active:rotate-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992V4.356M7.977 14.652H2.985v4.992m0 0h4.992m-4.992 0 3.181-3.182a8.25 8.25 0 0 0 13.803-3.7M21.015 4.356 17.834 7.538A8.25 8.25 0 0 0 4.031 11.24" />
            </svg>
          </button>
        ) : null}

        <button
          type="button"
          onClick={scrollToTopElastic}
          className={`group absolute right-0 ${showRefresh ? 'bottom-[4.25rem]' : 'bottom-0'} w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg transition-all ${
            showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          } active:scale-95 flex items-center justify-center`}
          aria-label={t('action_top')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6 transition-transform duration-200 group-hover:-translate-y-0.5 group-active:translate-y-0"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 10.5 12 4.5l6 6M12 4.5v15" />
          </svg>
        </button>
      </div>

      <Link
        href={routes.create()}
        className={`hidden md:flex fixed right-6 ${isPostDetail ? 'bottom-24' : 'bottom-6'} z-50 w-14 h-14 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 items-center justify-center transition-transform active:scale-95`}
        aria-label={t('action_create')}
        style={{ display: isNewPost ? 'none' : undefined }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>
    </>
  );
}
