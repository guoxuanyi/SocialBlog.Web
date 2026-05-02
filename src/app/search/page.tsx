'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import PostCard, { PostCardSkeleton } from '@/components/PostCard';
import { apiGet, displayAuthor, getPostId, type PaginatedResponse, type PostDto } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';

type SearchCacheEntry = {
  posts: PostDto[];
  skip: number;
  hasMore: boolean;
  scrollY: number;
  at: number;
};

const searchCache = new Map<string, SearchCacheEntry>();

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const suggestions = ['Trending', 'City Guides', 'Solo Travel', 'Photography', 'Food', 'Tech'];
  const quick = [
    { title: 'AI', subtitle: '工具与灵感' },
    { title: 'Design', subtitle: '交互与细节' },
    { title: 'Next.js', subtitle: '前端实践' },
    { title: 'Product', subtitle: '增长与体验' },
    { title: 'Writing', subtitle: '内容创作' },
  ];

  const cached = q ? searchCache.get(q) : undefined;
  const [posts, setPosts] = useState<PostDto[]>(() => cached?.posts ?? []);
  const [loading, setLoading] = useState(() => (q ? !cached : false));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(() => (q ? (cached?.hasMore ?? true) : false));
  const [skip, setSkip] = useState(() => cached?.skip ?? 0);
  const limit = 20;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const recRef = useRef<HTMLDivElement | null>(null);
  const recDragRef = useRef({ active: false, pointerId: 0, startX: 0, startLeft: 0 });
  const scrollYRef = useRef(cached?.scrollY ?? 0);
  const [input, setInput] = useState(q);
  const nextHref = useMemo(() => {
    const s = input.trim();
    return s ? (`${routes.search()}?q=${encodeURIComponent(s)}` as unknown as Route) : (routes.search() as unknown as Route);
  }, [input]);

  const fetchPage = useCallback(async (nextSkip: number, mode: 'replace' | 'append') => {
    const isInitial = mode === 'replace';
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const data = await apiGet<PaginatedResponse<PostDto>>(
        `/api/Posts/search?keyword=${encodeURIComponent(q)}&skip=${nextSkip}&limit=${limit}`,
        { cache: 'no-store' }
      );
      setSkip(nextSkip);
      setHasMore(nextSkip + data.data.length < data.total);
      setPosts((prev) => (mode === 'append' ? [...prev, ...data.data] : data.data));
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败');
      setHasMore(false);
      setPosts((prev) => (mode === 'append' ? prev : []));
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [limit, q]);

  useEffect(() => {
    if (!q) {
      setPosts([]);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setSkip(0);
      setInput('');
      return;
    }
    const hit = searchCache.get(q);
    if (hit) {
      setPosts(hit.posts);
      setSkip(hit.skip);
      setHasMore(hit.hasMore);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      scrollYRef.current = hit.scrollY;
      requestAnimationFrame(() => window.scrollTo({ top: hit.scrollY, behavior: 'auto' }));
      return;
    }

    setPosts([]);
    setSkip(0);
    setHasMore(true);
    void fetchPage(0, 'replace');
  }, [fetchPage, q]);

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!q) return;
    if (error) return;
    searchCache.set(q, { posts, skip, hasMore, scrollY: scrollYRef.current, at: Date.now() });
  }, [error, hasMore, posts, q, skip]);

  useEffect(() => {
    const onRefresh = (evt: Event) => {
      const e = evt as CustomEvent<{ key?: string }>;
      const k = (e.detail?.key ?? '').trim();
      if (!q) return;
      if (k && k !== '*' && k !== q) return;
      searchCache.delete(q);
      setPosts([]);
      setSkip(0);
      setHasMore(true);
      setError(null);
      scrollYRef.current = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      void fetchPage(0, 'replace');
    };
    window.addEventListener('app:refresh-search', onRefresh as EventListener);
    return () => window.removeEventListener('app:refresh-search', onRefresh as EventListener);
  }, [fetchPage, q]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!q) return;
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
  }, [fetchPage, hasMore, limit, loading, loadingMore, q, skip]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Discover" mode="discover" showBack={true} showSearch={false} />
      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <form
          className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3"
          action={routes.search()}
          method="GET"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(nextHref);
          }}
        >
          <span className="text-teal-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            name="q"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            list="search-suggestions"
            placeholder="Search posts..."
            className="w-full outline-none text-sm text-gray-700 placeholder:text-gray-400"
            autoComplete="on"
          />
          <datalist id="search-suggestions">
            {Array.from(new Set([...suggestions, ...quick.map((x) => x.title)])).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="mt-4 overflow-x-auto flex items-center gap-2 hide-scrollbar">
          {suggestions.map((s) => (
            <Link
              key={s}
              href={`${routes.search()}?q=${encodeURIComponent(s)}`}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {s}
            </Link>
          ))}
        </div>

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
              {quick.map((r) => (
                <Link
                  key={r.title}
                  href={`${routes.search()}?q=${encodeURIComponent(r.title)}`}
                  className="w-80 shrink-0 min-h-[132px] rounded-2xl border border-gray-200 bg-white p-6 hover:bg-gray-50 transition-colors active:scale-[0.99]"
                >
                  <div className="text-lg font-extrabold tracking-tight text-gray-900">{r.title}</div>
                  <div className="mt-1 text-sm text-gray-500">{r.subtitle}</div>
                  <div className="mt-4 text-xs font-semibold text-gray-800 underline underline-offset-4">Search</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-sm text-red-700">{error}</div>
          ) : !q ? (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">
              输入关键词开始探索
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">没有找到相关内容</div>
          ) : (
            posts.map((p, i) => {
              const postId = getPostId(p);
              if (!postId) return null;
              return (
                <PostCard
                  key={postId}
                  title={p.title}
                  excerpt={(p.content ?? '').slice(0, 120) + ((p.content ?? '').length > 120 ? '…' : '')}
                  author={displayAuthor(p.authorId)}
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

          {!loading && !error && q ? <div ref={sentinelRef} /> : null}
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
          {!loading && !error && q && hasMore && posts.length > 0 && !loadingMore ? (
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
          {!loading && !error && q && !hasMore && posts.length > 0 ? (
            <div className="text-center text-xs text-gray-400 py-6">没有更多了</div>
          ) : null}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function SearchFallback() {
  const suggestions = ['AI', 'Next.js', 'Design', 'Product', 'Startup', 'React', 'Writing', 'Life'];
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header title="Discover" mode="discover" showBack={true} showSearch={false} />
      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-5 h-5 rounded skeleton" />
          <div className="h-4 flex-1 rounded skeleton" />
          <div className="h-8 w-20 rounded-xl skeleton" />
        </div>

        <div className="mt-4 overflow-x-auto flex items-center gap-2 hide-scrollbar">
          {suggestions.map((s) => (
            <span key={s} className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold border bg-white border-gray-200 text-gray-600">
              {s}
            </span>
          ))}
        </div>

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

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchInner />
    </Suspense>
  );
}
