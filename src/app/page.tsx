'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import PostCard, { PostCardSkeleton } from '@/components/PostCard';
import Header from '@/components/Header';
import CategoryFilter from '@/components/CategoryFilter';
import BottomNav from '@/components/BottomNav';
import { apiGet, displayAuthor, getPostId, toUserErrorMessage, type PaginatedResponse, type PostDto } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

type FeedTab = 'forYou' | 'following';

function buildHomeHref(tab: FeedTab, category: string) {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (category && category !== 'Trending') params.set('category', category);
  const qs = params.toString();
  return (qs ? `/?${qs}` : '/') as import('next').Route;
}

const recommended = [
  { title: 'City Guides', subtitle: '周末出游灵感', tone: 'from-orange-50 to-orange-100 border-orange-100 text-orange-700' },
  { title: 'Photography', subtitle: '构图与后期', tone: 'from-teal-50 to-teal-100 border-teal-100 text-teal-800' },
  { title: 'Tech', subtitle: '产品与工程', tone: 'from-gray-50 to-gray-100 border-gray-200 text-gray-800' },
  { title: 'Food', subtitle: '今天吃什么', tone: 'from-amber-50 to-amber-100 border-amber-100 text-amber-800' },
  { title: 'Solo Travel', subtitle: '一个人的路', tone: 'from-sky-50 to-sky-100 border-sky-100 text-sky-800' },
];

type HomeCacheEntry = {
  posts: PostDto[];
  skip: number;
  hasMore: boolean;
  scrollY: number;
  at: number;
};

const homeCache = new Map<string, HomeCacheEntry>();

function HomeInner() {
  const { state } = useAuth();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'following' ? 'following' : 'forYou';
  const category = (searchParams.get('category') ?? 'Trending').trim() || 'Trending';
  const userId = state.status === 'authenticated' ? state.user.id : '';
  const cacheKey = `${tab}|${category}|${state.status}|${userId}`;
  const cached = homeCache.get(cacheKey);

  const [posts, setPosts] = useState<PostDto[]>(() => cached?.posts ?? []);
  const [loading, setLoading] = useState(() => !cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(() => cached?.hasMore ?? true);
  const [skip, setSkip] = useState(() => cached?.skip ?? 0);
  const [showScrollHint, setShowScrollHint] = useState(() => (cached?.scrollY ?? 0) <= 80);
  const limit = 20;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const recRef = useRef<HTMLDivElement | null>(null);
  const recDragRef = useRef({ active: false, pointerId: 0, startX: 0, startLeft: 0 });
  const scrollYRef = useRef(cached?.scrollY ?? 0);

  const fetchPage = useCallback(async (nextSkip: number, mode: 'replace' | 'append') => {
    const isInitial = mode === 'replace';
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const data =
        tab === 'forYou'
          ? await apiGet<PaginatedResponse<PostDto>>(`/api/Posts?skip=${nextSkip}&limit=${limit}`, { cache: 'no-store' })
          : state.status === 'authenticated'
            ? await apiGet<PaginatedResponse<PostDto>>(`/api/Posts/author/${userId}?skip=${nextSkip}&limit=${limit}`, {
                cache: 'no-store',
              })
            : ({ data: [], total: 0, skip: nextSkip, limit } as PaginatedResponse<PostDto>);

      setSkip(nextSkip);
      setHasMore(nextSkip + data.data.length < data.total);
      setPosts((prev) => (mode === 'append' ? [...prev, ...data.data] : data.data));
    } catch (e) {
      setError(toUserErrorMessage(e, '加载失败'));
      setHasMore(false);
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [limit, state.status, tab, userId]);

  useEffect(() => {
    const hit = homeCache.get(cacheKey);
    if (hit) {
      setPosts(hit.posts);
      setSkip(hit.skip);
      setHasMore(hit.hasMore);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      setShowScrollHint(hit.scrollY <= 80);
      scrollYRef.current = hit.scrollY;
      requestAnimationFrame(() => window.scrollTo({ top: hit.scrollY, behavior: 'auto' }));
      return;
    }

    setPosts([]);
    setSkip(0);
    setHasMore(true);
    void fetchPage(0, 'replace');
  }, [cacheKey, fetchPage]);

  useEffect(() => {
    const ensureLoaded = () => {
      if (typeof document === 'undefined') return;
      if (error) return;
      if (posts.length > 0) return;
      if (loadingMore) return;
      setSkip(0);
      setHasMore(true);
      setError(null);
      setLoading(false);
      void fetchPage(0, 'replace');
    };

    const onPageShow = () => ensureLoaded();
    const onVisibility = () => ensureLoaded();

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [error, fetchPage, loadingMore, posts.length]);

  useEffect(() => {
    const onRefresh = (evt: Event) => {
      const e = evt as CustomEvent<{ key?: string }>;
      if (e.detail?.key && e.detail.key !== cacheKey) return;
      homeCache.delete(cacheKey);
      setPosts([]);
      setSkip(0);
      setHasMore(true);
      setError(null);
      setShowScrollHint(true);
      scrollYRef.current = 0;
      void fetchPage(0, 'replace');
    };
    window.addEventListener('app:refresh-feed', onRefresh as EventListener);
    return () => window.removeEventListener('app:refresh-feed', onRefresh as EventListener);
  }, [cacheKey, fetchPage]);

  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
      if (window.scrollY > 80) setShowScrollHint(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (error) return;
    homeCache.set(cacheKey, { posts, skip, hasMore, scrollY: scrollYRef.current, at: Date.now() });
  }, [cacheKey, error, hasMore, posts, skip]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loading || loadingMore) return;
        void fetchPage(skip + limit, 'append');
      },
      { root: null, rootMargin: '400px', threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, limit, loading, loadingMore, skip]);

  const filteredPosts = useMemo(() => {
    if (category.toLowerCase() === 'trending') return posts;
    const key = category.toLowerCase();
    return posts.filter((p) => {
      const haystack = `${p.title}\n${p.content}\n${(p.tags ?? []).join(' ')}`.toLowerCase();
      return haystack.includes(key);
    });
  }, [posts, category]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Discover" mode="discover" showBack={false} showSearch={false} />
      
      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <CategoryFilter tab={tab} category={category} />

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">Recommended</div>
            <div className="text-xs text-gray-400">按住拖动 / Shift+滚轮</div>
          </div>
          <div className="mt-2 relative">
            <button
              type="button"
              onClick={() => recRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 border border-gray-200 shadow-sm items-center justify-center text-gray-700 hover:bg-white active:scale-95 transition-transform"
              aria-label="Scroll left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => recRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 border border-gray-200 shadow-sm items-center justify-center text-gray-700 hover:bg-white active:scale-95 transition-transform"
              aria-label="Scroll right"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <div
              ref={recRef}
              className="overflow-x-auto hide-scrollbar cursor-grab active:cursor-grabbing select-none"
              onPointerDown={(e) => {
                const el = recRef.current;
                if (!el) return;
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                recDragRef.current = { active: true, pointerId: e.pointerId, startX: e.clientX, startLeft: el.scrollLeft };
                el.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const el = recRef.current;
                const d = recDragRef.current;
                if (!el || !d.active || d.pointerId !== e.pointerId) return;
                el.scrollLeft = d.startLeft - (e.clientX - d.startX);
              }}
              onPointerUp={(e) => {
                const el = recRef.current;
                const d = recDragRef.current;
                if (!el || d.pointerId !== e.pointerId) return;
                recDragRef.current = { active: false, pointerId: 0, startX: 0, startLeft: 0 };
                try {
                  el.releasePointerCapture(e.pointerId);
                } catch {}
              }}
              onPointerCancel={(e) => {
                const el = recRef.current;
                const d = recDragRef.current;
                if (!el || d.pointerId !== e.pointerId) return;
                recDragRef.current = { active: false, pointerId: 0, startX: 0, startLeft: 0 };
                try {
                  el.releasePointerCapture(e.pointerId);
                } catch {}
              }}
            >
              <div className="flex items-stretch gap-3 min-w-max pr-2">
              {recommended.map((r) => (
                <Link
                  key={r.title}
                  href={buildHomeHref(tab, r.title)}
                  className={`w-80 shrink-0 min-h-[132px] rounded-2xl border bg-gradient-to-br ${r.tone} p-6 transition-transform active:scale-[0.99]`}
                >
                  <div className="text-lg font-extrabold tracking-tight">{r.title}</div>
                  <div className="mt-1 text-sm opacity-80">{r.subtitle}</div>
                  <div className="mt-4 text-xs font-semibold underline underline-offset-4 opacity-90">Explore</div>
                </Link>
              ))}
              <Link
                href={buildHomeHref(tab, 'Trending')}
                className="w-80 shrink-0 min-h-[132px] rounded-2xl border border-gray-200 bg-white p-6 hover:bg-gray-50 transition-colors active:scale-[0.99]"
              >
                <div className="text-lg font-extrabold tracking-tight text-gray-900">Trending</div>
                <div className="mt-1 text-sm text-gray-500">大家都在看</div>
                <div className="mt-4 text-xs font-semibold text-gray-800 underline underline-offset-4">Explore</div>
              </Link>
            </div>
          </div>
        </div>
        </div>

        {!loading && !error && filteredPosts.length > 0 && showScrollHint ? (
          <div className="mt-3 flex justify-center">
            <div className="scroll-hint inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-semibold">
              <span>向下滑动继续探索</span>
              <span className="text-sm">↓</span>
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {loading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-sm text-red-700">
              {error}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">
              暂无内容
            </div>
          ) : (
            filteredPosts.map((p, i) => {
              const postId = getPostId(p);
              if (!postId) return null;
              return (
                <PostCard
                  key={postId}
                  title={p.title}
                  excerpt={(p.content ?? '').slice(0, 120) + ((p.content ?? '').length > 120 ? '…' : '')}
                  author={displayAuthor(p.authorId)}
                  authorId={p.authorId}
                  date={new Date(p.publishedAt ?? p.createdAt).toLocaleDateString()}
                  tags={p.tags ?? []}
                  likes={p.likeCount ?? 0}
                  comments={p.commentCount ?? 0}
                  coverImageUrl={p.coverImageUrl}
                  href={routes.posts.detail(postId)}
                  revealDelayMs={Math.min(240, i * 40)}
                />
              );
            })
          )}

          {!loading && !error ? <div ref={sentinelRef} /> : null}
          {loadingMore ? (
            <>
              <div className="flex items-center justify-center gap-3 py-2 text-xs text-gray-500">
                <span className="loading-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>加载更多</span>
              </div>
              {Array.from({ length: 2 }).map((_, i) => (
                <PostCardSkeleton key={`more-${i}`} />
              ))}
            </>
          ) : null}
          {!loading && !error && hasMore && posts.length > 0 && !loadingMore ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => fetchPage(skip + limit, 'append')}
                className="w-full py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.99] transition-transform"
              >
                点击加载更多
              </button>
            </div>
          ) : null}
          {!loading && !error && !hasMore && posts.length > 0 ? (
            <div className="text-center text-xs text-gray-400 py-6">没有更多了</div>
          ) : null}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header title="Discover" mode="discover" showBack={false} showSearch={false} />
      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="mt-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeInner />
    </Suspense>
  );
}
