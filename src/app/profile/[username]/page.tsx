'use client';

import Link from 'next/link';
import React, { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import PostCard, { PostCardSkeleton } from '@/components/PostCard';
import { routes } from '@/lib/routes';
import type { Route } from 'next';
import {
  apiDelete,
  apiGet,
  displayAuthor,
  followUser,
  getFollowers,
  getFollowStatus,
  getFollowing,
  getMyTrashPosts,
  getPostId,
  getUserProfile,
  getUserByUsername,
  isObjectId,
  restorePost,
  toUserErrorMessage,
  unfollowUser,
  type PaginatedResponse,
  type PostDto,
  type PublicUserDto,
} from '@/shared/api';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

type Tab = 'Published' | 'Bookmarked' | 'Drafts' | 'Trash';

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
  const [authorId, setAuthorId] = useState<string>(() => (isObjectId(username) ? username : ''));
  const isOwn = state.status === 'authenticated' && authorId && state.user.id === authorId;
  const [profile, setProfile] = useState<PublicUserDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [listMode, setListMode] = useState<'followers' | 'following' | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listUsers, setListUsers] = useState<PublicUserDto[]>([]);
  const [listTotal, setListTotal] = useState(0);

  const displayName = useMemo(() => {
    if (isOwn) return state.user.displayName ?? state.user.username;
    if (profile) return profile.displayName ?? profile.username ?? displayAuthor(profile.id);
    return authorId ? displayAuthor(authorId) : `@${username}`;
  }, [authorId, isOwn, profile, state.status, state.user, username]);

  const tab = (searchParams.get('tab') as Tab) || 'Published';
  const cacheKey = `${username}|${tab}|${state.status}|${state.status === 'authenticated' ? state.user.id : ''}`;
  const cached = profileCache.get(cacheKey);

  const [posts, setPosts] = useState<PostDto[]>(() => cached?.posts ?? []);
  const [loading, setLoading] = useState(() => (tab === 'Bookmarked' ? false : !cached));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(() => (tab === 'Bookmarked' ? false : (cached?.hasMore ?? true)));
  const [skip, setSkip] = useState(() => cached?.skip ?? 0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const limit = 20;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollYRef = useRef(cached?.scrollY ?? 0);
  const [backHref, setBackHref] = useState<Route>(routes.home());

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!authorId) return;
      setLoadingProfile(true);
      try {
        const p = await getUserProfile(authorId);
        if (!cancelled) setProfile(p);
      } catch (e) {
        if (!cancelled) setProfile(null);
        try {
          window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: toUserErrorMessage(e, '加载用户失败') } }));
        } catch {}
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [authorId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (isObjectId(username)) {
        setAuthorId(username);
        setError(null);
        return;
      }
      if (state.status === 'authenticated' && username.trim().toLowerCase() === state.user.username.trim().toLowerCase()) {
        setAuthorId(state.user.id);
        setError(null);
        return;
      }
      try {
        const u = await getUserByUsername(username);
        if (!cancelled) setAuthorId(u.id);
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) {
          setAuthorId('');
          setError(toUserErrorMessage(e, '用户不存在'));
        }
        try {
          window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: toUserErrorMessage(e, '用户不存在') } }));
        } catch {}
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [state.status, state.user, username]);

  function normalizeBackHref(raw: string): Route {
    const v = raw.trim();
    if (!v) return routes.home();
    if (!v.startsWith('/')) return routes.home();
    if (v.startsWith('/posts/new')) return routes.home();
    return v as Route;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const prev = window.sessionStorage.getItem('sb:nav:previous') ?? '';
      setBackHref(normalizeBackHref(prev));
    } catch {
      setBackHref(routes.home());
    }
  }, [username, tab]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!authorId) return;
      if (isOwn) {
        setFollowing(false);
        return;
      }
      if (state.status !== 'authenticated') {
        setFollowing(false);
        return;
      }
      try {
        const s = await getFollowStatus(authorId);
        if (!cancelled) setFollowing(Boolean(s.following));
      } catch {
        if (!cancelled) setFollowing(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [authorId, isOwn, state.status]);

  const followersCount = (profile?.followersCount ?? (isOwn ? state.user.followersCount : 0) ?? 0) as number;
  const followingCount = (profile?.followingCount ?? (isOwn ? state.user.followingCount : 0) ?? 0) as number;

  const coverUrl = (isOwn ? state.user.coverImageUrl : profile?.coverImageUrl) ?? '';
  const avatarUrl = (isOwn ? state.user.avatarUrl : profile?.avatarUrl) ?? '';

  function tabLabel(t: Tab): string {
    if (t === 'Published') return '已发布';
    if (t === 'Drafts') return '草稿';
    if (t === 'Trash') return '回收站';
    return '收藏';
  }

  async function toggleFollow() {
    if (!authorId) return;
    if (state.status !== 'authenticated') {
      try {
        window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next: routes.profile(authorId) } }));
      } catch {}
      return;
    }
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (!following) {
        await followUser(authorId);
        setFollowing(true);
        setProfile((p) => (p ? { ...p, followersCount: (p.followersCount ?? 0) + 1 } : p));
      } else {
        await unfollowUser(authorId);
        setFollowing(false);
        setProfile((p) => (p ? { ...p, followersCount: Math.max(0, (p.followersCount ?? 0) - 1) } : p));
      }
    } catch (e) {
      try {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: toUserErrorMessage(e, '操作失败') } }));
      } catch {}
    } finally {
      setFollowLoading(false);
    }
  }

  async function openList(mode: 'followers' | 'following') {
    if (!authorId) return;
    setListMode(mode);
    setListLoading(true);
    try {
      const data =
        mode === 'followers' ? await getFollowers(authorId, 0, 30) : await getFollowing(authorId, 0, 30);
      setListUsers(data.data);
      setListTotal(data.total);
    } catch (e) {
      setListUsers([]);
      setListTotal(0);
      try {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: toUserErrorMessage(e, '加载失败') } }));
      } catch {}
    } finally {
      setListLoading(false);
    }
  }

  async function deletePostToTrash(postId: string) {
    if (!isOwn) return;
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete<object>(`/api/Posts/${encodeURIComponent(postId)}`);
      setPosts((prev) => prev.filter((x) => getPostId(x) !== postId));
      setConfirmDeleteId(null);
    } catch (e) {
      setError(toUserErrorMessage(e, '删除失败'));
    } finally {
      setDeleting(false);
    }
  }

  async function restoreFromTrash(postId: string) {
    if (!isOwn) return;
    if (restoringId) return;
    setRestoringId(postId);
    setError(null);
    try {
      await restorePost(postId);
      setPosts((prev) => prev.filter((x) => getPostId(x) !== postId));
    } catch (e) {
      setError(toUserErrorMessage(e, '恢复失败'));
    } finally {
      setRestoringId(null);
    }
  }

  const fetchPage = useCallback(async (nextSkip: number, mode: 'replace' | 'append') => {
    const isInitial = mode === 'replace';
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      if (!authorId) throw new Error('Invalid profile id');
      const data =
        tab === 'Trash'
          ? state.status === 'authenticated' && isOwn
            ? await getMyTrashPosts(nextSkip, limit)
            : ({ data: [], total: 0, skip: nextSkip, limit } as PaginatedResponse<PostDto>)
          : await apiGet<PaginatedResponse<PostDto>>(`/api/Posts/author/${encodeURIComponent(authorId)}?skip=${nextSkip}&limit=${limit}`, {
              cache: 'no-store',
            });
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
  }, [authorId, isOwn, limit, state.status, tab]);

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
    const ensureLoaded = () => {
      if (typeof document === 'undefined') return;
      if (tab === 'Bookmarked') return;
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
    const onVisibility = () => {
      if (document.visibilityState === 'visible') ensureLoaded();
    };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [error, fetchPage, loadingMore, posts.length, tab]);

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
  const visiblePosts = tab === 'Trash' ? posts : tab === 'Drafts' ? draftPosts : tab === 'Published' ? publishedPosts : [];
  const tabs = (isOwn ? (['Published', 'Bookmarked', 'Drafts', 'Trash'] as const) : (['Published'] as const)) satisfies readonly Tab[];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title={displayName} mode="profile" showBack={true} backHref={backHref} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto pb-20 md:pb-4">
        <div className="relative">
          {coverUrl ? (
            <div className="h-[33vh] max-h-[360px] min-h-[180px] bg-gray-100 overflow-hidden">
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-[33vh] max-h-[360px] min-h-[180px] bg-gradient-to-r from-gray-100 to-gray-200" />
          )}
          <div className="px-4">
            <div className="-mt-10 flex items-end justify-between">
              <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-20 h-20 object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-extrabold text-2xl">
                    {displayName.replace('@', '').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isOwn ? (
                <Link
                  href={routes.settings.profile()}
                  className="w-11 h-11 rounded-full bg-white border border-gray-200 text-gray-800 inline-flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
                  aria-label="Edit profile"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487 19.5 7.125m-2.638-2.638L7.5 13.85V17h3.15l9.362-9.362m-2.638-2.638a2.25 2.25 0 0 1 3.182 3.182" />
                  </svg>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={followLoading || loadingProfile}
                  onClick={toggleFollow}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                    following ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-orange-600 text-white hover:bg-orange-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {following ? 'Following' : 'Follow'}
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
              <button type="button" onClick={() => openList('following')} className="bg-white border border-gray-200 rounded-2xl py-3 active:scale-[0.99] transition-transform">
                <div className="text-lg font-extrabold text-gray-900">{followingCount}</div>
                <div className="text-[11px] text-gray-500">FOLLOWING</div>
              </button>
              <button type="button" onClick={() => openList('followers')} className="bg-white border border-gray-200 rounded-2xl py-3 active:scale-[0.99] transition-transform">
                <div className="text-lg font-extrabold text-gray-900">{followersCount}</div>
                <div className="text-[11px] text-gray-500">FOLLOWERS</div>
              </button>
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
                  {tabLabel(t)}
                </Link>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {tab === 'Drafts' && isOwn ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm text-gray-600">点击草稿卡片进入编辑</div>
              ) : null}
              {loading ? (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PostCardSkeleton key={i} />
                  ))}
                </>
              ) : tab === 'Bookmarked' ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">暂无收藏</div>
              ) : visiblePosts.length === 0 ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">暂无内容</div>
              ) : (
                visiblePosts.map((p, i) => {
                  const postId = getPostId(p);
                  if (!postId) return null;
                  const fromHref = buildTabHref(username, tab);
                  const editHref = `${routes.posts.new()}?draft=${encodeURIComponent(postId)}&from=${encodeURIComponent(fromHref as unknown as string)}` as Route;
                  const href = tab === 'Trash' ? undefined : isOwn && tab === 'Drafts' ? editHref : routes.posts.detail(postId);
                  return (
                    <div key={postId} className="relative">
                      {isOwn ? (
                        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
                          {tab === 'Trash' ? (
                            <button
                              type="button"
                              disabled={restoringId === postId}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void restoreFromTrash(postId);
                              }}
                              className="w-10 h-10 rounded-full bg-white border border-gray-200 text-emerald-700 inline-flex items-center justify-center hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-transform"
                              aria-label="Restore post"
                              title="Restore"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M2.985 14.652a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                              </svg>
                            </button>
                          ) : (
                            <>
                              <Link
                                href={editHref}
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-800 inline-flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
                                aria-label="Edit post"
                                title="Edit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487 19.5 7.125m-2.638-2.638L7.5 13.85V17h3.15l9.362-9.362m-2.638-2.638a2.25 2.25 0 0 1 3.182 3.182" />
                                </svg>
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setConfirmDeleteId(postId);
                                }}
                                className="w-10 h-10 rounded-full bg-white border border-gray-200 text-red-600 inline-flex items-center justify-center hover:bg-red-50 active:scale-95 transition-transform"
                                aria-label="Delete post"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                  />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                      <PostCard
                        title={p.title}
                        excerpt={(p.content ?? '').slice(0, 120) + ((p.content ?? '').length > 120 ? '…' : '')}
                        author={displayAuthor(p.authorId)}
                        authorId={p.authorId}
                        date={new Date(p.publishedAt ?? p.createdAt).toLocaleDateString()}
                        tags={p.tags ?? []}
                        likes={p.likeCount ?? 0}
                        comments={p.commentCount ?? 0}
                        coverImageUrl={p.coverImageUrl}
                        status={p.status}
                        href={href}
                        revealDelayMs={Math.min(240, i * 40)}
                      />
                    </div>
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

      {confirmDeleteId ? (
        <div
          className="fixed inset-0 z-[80] bg-black/40 p-4 flex items-end md:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div className="w-full max-w-md bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="text-base font-extrabold text-gray-900">移到回收站？</div>
              <div className="mt-2 text-sm text-gray-600">删除后可在回收站中恢复。</div>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void deletePostToTrash(confirmDeleteId)}
                  className="w-full h-11 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  确认删除
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="w-full h-11 rounded-2xl border border-gray-200 bg-white text-gray-800 font-semibold hover:bg-gray-50 active:scale-[0.99] transition-transform"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {listMode ? (
        <div
          className="fixed inset-0 z-[70] bg-black/40 p-4 flex items-end md:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setListMode(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <div className="text-sm font-extrabold text-gray-900">{listMode === 'followers' ? 'Followers' : 'Following'}</div>
              <button
                type="button"
                onClick={() => setListMode(null)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 transition-transform inline-flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="max-h-[62vh] overflow-auto">
              {listLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full skeleton" />
                      <div className="flex-1">
                        <div className="h-3 w-40 rounded skeleton" />
                        <div className="mt-2 h-3 w-24 rounded skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : listUsers.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">暂无</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {listUsers.map((u) => (
                    <Link
                      key={u.id}
                      href={routes.profile(u.id)}
                      className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50"
                      onClick={() => setListMode(null)}
                    >
                      <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-700 font-semibold">{(u.displayName ?? u.username ?? 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{u.displayName ?? u.username}</div>
                        <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {!listLoading && listUsers.length > 0 ? (
              <div className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">{listUsers.length} / {listTotal}</div>
            ) : null}
          </div>
        </div>
      ) : null}

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
