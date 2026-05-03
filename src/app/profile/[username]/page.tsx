'use client';

import Link from 'next/link';
import React, { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import PostCard, { PostCardSkeleton } from '@/components/PostCard';
import { routes } from '@/lib/routes';
import type { Route } from 'next';
import { apiGet, displayAuthor, getPostId, resolveAuthorId, toUserErrorMessage, type PaginatedResponse, type PostDto } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

type Tab = 'Published' | 'Bookmarked' | 'Drafts';

type ProfileCacheEntry = {
  posts: PostDto[];
  skip: number;
  hasMore: boolean;
  scrollY: number;
  at: number;
};

const profileCache = new Map<string, ProfileCacheEntry>();

function buildTabHref(username: string, tab: Tab): Route {
  const params = new URLSearchParams();
  params.set('tab', tab);
  return `${routes.profile(username)}?${params.toString()}` as Route;
}

function UserProfileInner({ username }: { username: string }) {
  const { state } = useAuth();
  const searchParams = useSearchParams();
  const authorId = useMemo(() => resolveAuthorId(username), [username]);
  const isOwn = state.status === 'authenticated' && authorId && state.user.id === authorId;
  const displayName = isOwn
    ? state.user.displayName ?? state.user.username
    : authorId
      ? displayAuthor(authorId)
      : `@${username}`;
  const tab = (searchParams.get('tab') as Tab) || 'Published';
  const cacheKey = `${username}|${tab}|${state.status}|${state.status === 'authenticated' ? state.user.id : ''}`;
  const cached = profileCache.get(cacheKey);

  const [posts, setPosts] = useState<PostDto[]>(() => cached?.posts ?? []);
  const [loading, setLoading] = useState(() => (tab === 'Bookmarked' ? false : !cached));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(() => (tab === 'Bookmarked' ? false : (cached?.hasMore ?? true)));
  const [skip, setSkip] = useState(() => cached?.skip ?? 0);
  const limit = 20;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollYRef = useRef(cached?.scrollY ?? 0);

  const fetchPage = useCallback(async (nextSkip: number, mode: 'replace' | 'append') => {
    const isInitial = mode === 'replace';
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      if (!authorId) {
        setPosts([]);
        setError('Invalid profile id');
        setHasMore(false);
        return;
      }
      const data = await apiGet<PaginatedResponse<PostDto>>(
        `/api/Posts/author/${encodeURIComponent(authorId)}?skip=${nextSkip}&limit=${limit}`,
        { cache: 'no-store' }
      );
      setSkip(nextSkip);
      setHasMore(nextSkip + data.data.length < data.total);
      setPosts((prev) => (mode === 'append' ? [...prev, ...data.data] : data.data));
    } catch (e) {
      setError(toUserErrorMessage(e, '加载失败'));
      setHasMore(false);
      setPosts((prev) => (mode === 'append' ? prev : []));
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [authorId, limit]);

  useEffect(() => {
    if (tab === 'Bookmarked') {
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      setHasMore(false);
      return;
    }

    const hit = profileCache.get(cacheKey);
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
  }, [cacheKey, fetchPage, tab]);

  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (tab === 'Bookmarked') return;
    if (error) return;
    profileCache.set(cacheKey, { posts, skip, hasMore, scrollY: scrollYRef.current, at: Date.now() });
  }, [cacheKey, error, hasMore, posts, skip, tab]);

  useEffect(() => {
    const onRefresh = (evt: Event) => {
      const e = evt as CustomEvent<{ key?: string }>;
      const k = (e.detail?.key ?? '').trim();
      if (tab === 'Bookmarked') return;
      if (k && k !== cacheKey) return;
      profileCache.delete(cacheKey);
      setPosts([]);
      setSkip(0);
      setHasMore(true);
      setError(null);
      scrollYRef.current = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      void fetchPage(0, 'replace');
    };
    window.addEventListener('app:refresh-profile', onRefresh as EventListener);
    return () => window.removeEventListener('app:refresh-profile', onRefresh as EventListener);
  }, [cacheKey, fetchPage, tab]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!authorId) return;
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
  }, [authorId, fetchPage, hasMore, limit, loading, loadingMore, skip]);

  const publishedPosts = useMemo(() => posts.filter((p) => p.status === 'Published'), [posts]);
  const draftPosts = useMemo(() => posts.filter((p) => p.status !== 'Published'), [posts]);
  const visiblePosts = tab === 'Drafts' ? draftPosts : tab === 'Published' ? publishedPosts : [];
  const tabs = (isOwn ? (['Published', 'Bookmarked', 'Drafts'] as const) : (['Published'] as const)) satisfies readonly Tab[];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title={displayName} mode="profile" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto pb-20 md:pb-4">
        <div className="relative">
          <div className="h-36 bg-gradient-to-r from-gray-100 to-gray-200" />
          <div className="px-4">
            <div className="-mt-10 flex items-end justify-between">
              <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-extrabold text-2xl">
                  {displayName.replace('@', '').charAt(0).toUpperCase()}
                </div>
              </div>
              {isOwn ? (
                <Link
                  href={routes.settings.index()}
                  className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"
                >
                  Settings
                </Link>
              ) : (
                <button type="button" className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors">
                  Follow
                </button>
              )}
            </div>

            <div className="mt-4">
              <div className="text-xl font-extrabold text-gray-900">{displayName}</div>
              <div className="mt-1 text-sm text-gray-500">
                {isOwn ? state.user.bio ?? '还没有填写个人简介。' : 'Urban explorer and insider guide. Dedicated to finding the hidden gems in every city.'}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="bg-white border border-gray-200 rounded-2xl py-3">
                <div className="text-lg font-extrabold text-gray-900">{publishedPosts.length}</div>
                <div className="text-[11px] text-gray-500">POSTS</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl py-3">
                <div className="text-lg font-extrabold text-gray-900">842</div>
                <div className="text-[11px] text-gray-500">FOLLOWING</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl py-3">
                <div className="text-lg font-extrabold text-gray-900">12.4k</div>
                <div className="text-[11px] text-gray-500">FOLLOWERS</div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6 border-b border-gray-100">
              {tabs.map((t) => (
                <Link
                  key={t}
                  href={buildTabHref(username, t)}
                  className={`pb-3 text-sm font-semibold transition-colors ${
                    tab === t ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t}
                </Link>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {loading ? (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PostCardSkeleton key={i} />
                  ))}
                </>
              ) : error ? (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-sm text-red-700">{error}</div>
              ) : tab === 'Bookmarked' ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">暂无收藏</div>
              ) : visiblePosts.length === 0 ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">暂无内容</div>
              ) : (
                visiblePosts.map((p, i) => {
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

              {!loading && !error && tab !== 'Bookmarked' ? <div ref={sentinelRef} /> : null}
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
              {!loading && !error && tab !== 'Bookmarked' && hasMore && posts.length > 0 && !loadingMore ? (
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
              {!loading && !error && tab !== 'Bookmarked' && !hasMore && posts.length > 0 ? (
                <div className="text-center text-xs text-gray-400 py-6">没有更多了</div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function ProfileFallback({ username }: { username?: string }) {
  const display = username ? `@${username}` : '@…';
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header title={display} mode="profile" showBack={true} showSearch={false} />
      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto pb-20 md:pb-4">
        <div className="relative">
          <div className="h-36 bg-gradient-to-r from-gray-100 to-gray-200" />
          <div className="px-4">
            <div className="-mt-10 flex items-end justify-between">
              <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                <div className="w-16 h-16 rounded-xl skeleton" />
              </div>
              <div className="h-10 w-28 rounded-xl skeleton" />
            </div>
          </div>
        </div>

        <div className="px-4 mt-4">
          <div className="h-5 w-44 rounded skeleton" />
          <div className="mt-2 h-4 w-72 rounded skeleton" />
        </div>

        <div className="px-4 mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

export default function UserProfile({ params }: { params: Promise<{ username: string }> }) {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <UserProfileResolved params={params} />
    </Suspense>
  );
}

function UserProfileResolved({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  return <UserProfileInner username={username} />;
}
