'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { apiDelete, apiGet, apiPostJson, displayAuthor, isObjectId, toUserErrorMessage, type CommentDto, type PaginatedResponse, type PostDto } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { routes } from '@/lib/routes';
import { useParams, useRouter } from 'next/navigation';

export default function PostDetail() {
  const router = useRouter();
  const { state } = useAuth();
  const params = useParams();
  const rawId = (params as { id?: string | string[] } | null)?.id;
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
  const userId = state.status === 'authenticated' ? state.user.id : '';

  const [post, setPost] = useState<PostDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);
  const [progress, setProgress] = useState(0);
  const [coverShift, setCoverShift] = useState(0);
  const [animateIn, setAnimateIn] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const publishedDate = useMemo(() => {
    if (!post) return '';
    return new Date(post.publishedAt ?? post.createdAt).toLocaleDateString();
  }, [post]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!id || !isObjectId(id)) {
        setPost(null);
        setComments([]);
        setLiked(false);
        setError('Invalid postId');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const base = [
          apiGet<PostDto>(`/api/Posts/${encodeURIComponent(id)}`, { cache: 'no-store' }),
          apiGet<PaginatedResponse<CommentDto>>(`/api/Posts/${encodeURIComponent(id)}/comments?skip=0&limit=50`, {
            cache: 'no-store',
          }),
        ] as const;

        const likeTask =
          state.status === 'authenticated'
            ? apiGet<{ liked: boolean }>(
                `/api/Posts/${encodeURIComponent(id)}/like?userId=${encodeURIComponent(userId)}`,
                { cache: 'no-store' }
              )
            : Promise.resolve({ liked: false });

        const [p, c, like] = await Promise.all([base[0], base[1], likeTask]);
        if (cancelled) return;
        setPost(p);
        setComments(c.data);
        setLiked(Boolean(like.liked));
      } catch (e) {
        if (!cancelled) setError(toUserErrorMessage(e, '加载失败'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [id, state.status, userId]);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const doc = document.documentElement;
        const total = Math.max(1, doc.scrollHeight - window.innerHeight);
        const p = Math.min(1, Math.max(0, window.scrollY / total));
        setProgress(p);
        if (post?.coverImageUrl) setCoverShift(Math.min(22, window.scrollY * 0.08));
        else setCoverShift(0);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [post?.coverImageUrl]);

  async function toggleLike() {
    if (!id || !isObjectId(id)) return;
    if (state.status !== 'authenticated') {
      router.push(`${routes.auth.login()}?next=${encodeURIComponent(routes.posts.detail(id))}`);
      return;
    }
    if (togglingLike) return;
    setTogglingLike(true);
    try {
      if (!liked) {
        await apiPostJson<object, { userId: string }>(`/api/Posts/${encodeURIComponent(id)}/like`, { userId: state.user.id });
        setLiked(true);
      } else {
        await apiDelete<object>(`/api/Posts/${encodeURIComponent(id)}/like?userId=${encodeURIComponent(state.user.id)}`);
        setLiked(false);
      }
      const p = await apiGet<PostDto>(`/api/Posts/${encodeURIComponent(id)}`, { cache: 'no-store' });
      setPost(p);
    } catch (e) {
      setError(toUserErrorMessage(e, '操作失败'));
    } finally {
      setTogglingLike(false);
    }
  }

  async function submitComment() {
    if (!id || !isObjectId(id)) return;
    if (state.status !== 'authenticated') {
      router.push(`${routes.auth.login()}?next=${encodeURIComponent(routes.posts.detail(id))}`);
      return;
    }
    const text = commentText.trim();
    if (!text || submittingComment) return;
    setSubmittingComment(true);
    try {
      await apiPostJson<object, { authorId: string; content: string; parentCommentId: string | null }>(
        `/api/Posts/${encodeURIComponent(id)}/comments`,
        { authorId: state.user.id, content: text, parentCommentId: null }
      );
      setCommentText('');
      const c = await apiGet<PaginatedResponse<CommentDto>>(`/api/Posts/${encodeURIComponent(id)}/comments?skip=0&limit=50`, {
        cache: 'no-store',
      });
      setComments(c.data);
      const p = await apiGet<PostDto>(`/api/Posts/${encodeURIComponent(id)}`, { cache: 'no-store' });
      setPost(p);
    } catch (e) {
      setError(toUserErrorMessage(e, '评论失败'));
    } finally {
      setSubmittingComment(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Discover" mode="detail" showBack={true} showSearch={false} />
      {!loading && !error && post ? (
        <div
          className="fixed left-0 right-0 top-14 h-0.5 bg-orange-500 origin-left z-40"
          style={{ transform: `scaleX(${progress})` }}
        />
      ) : null}

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto pb-20 md:pb-4">
        {loading ? (
          <div className="p-4">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="w-full h-64 bg-gray-100">
                <div className="w-full h-full skeleton" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 rounded-full skeleton" />
                  <div className="h-6 w-20 rounded-full skeleton" />
                </div>
                <div className="mt-4 h-8 w-4/5 rounded skeleton" />
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full skeleton" />
                    <div>
                      <div className="h-3 w-32 rounded skeleton" />
                      <div className="mt-2 h-3 w-20 rounded skeleton" />
                    </div>
                  </div>
                  <div className="h-10 w-24 rounded-xl skeleton" />
                </div>

                <div className="mt-6 space-y-3">
                  <div className="h-3 w-full rounded skeleton" />
                  <div className="h-3 w-11/12 rounded skeleton" />
                  <div className="h-3 w-10/12 rounded skeleton" />
                  <div className="h-3 w-9/12 rounded skeleton" />
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-6">
                  <div className="h-4 w-16 rounded skeleton" />
                  <div className="h-4 w-16 rounded skeleton" />
                </div>

                <div className="mt-8">
                  <div className="h-4 w-40 rounded skeleton" />
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full skeleton" />
                          <div className="flex-1">
                            <div className="h-3 w-40 rounded skeleton" />
                            <div className="mt-2 h-3 w-24 rounded skeleton" />
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="h-3 w-full rounded skeleton" />
                          <div className="h-3 w-5/6 rounded skeleton" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-sm text-red-700">{error}</div>
          </div>
        ) : !post ? (
          <div className="p-4">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">内容不存在</div>
          </div>
        ) : (
          <div>
            {post.coverImageUrl ? (
              <div className="px-4 pt-4 md:px-0 md:pt-0">
                <button
                  type="button"
                  onClick={() => setLightboxUrl(post.coverImageUrl ?? null)}
                  className="w-full bg-gray-100 overflow-hidden rounded-2xl block"
                  aria-label="View image"
                >
                  <img
                    src={post.coverImageUrl}
                    alt=""
                    className="w-full h-64 object-cover"
                    style={{ transform: `translateY(${coverShift}px) scale(1.06)`, willChange: 'transform' }}
                  />
                </button>
              </div>
            ) : null}

            <div className="px-4 pt-4">
              <div className="flex items-center gap-2">
                {(post.tags ?? []).slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-semibold"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900">{post.title}</h1>

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href={routes.profile(post.authorId)}
                  className="group flex items-center gap-3"
                  aria-label={`View profile: ${displayAuthor(post.authorId)}`}
                  title={displayAuthor(post.authorId)}
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                    {displayAuthor(post.authorId).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{displayAuthor(post.authorId)}</div>
                    <div className="text-xs text-gray-500">{publishedDate}</div>
                  </div>
                </Link>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-semibold border border-teal-100 active:scale-[0.98] transition-transform"
                >
                  Follow
                </button>
              </div>

              <div className="mt-6 space-y-4 text-gray-700 leading-7">
                {(post.content ?? '')
                  .split('\n')
                  .filter((l) => l.trim().length > 0)
                  .map((line, idx) => (
                    <p key={idx} className="text-sm">
                      {line}
                    </p>
                  ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-6 text-gray-600">
                <button
                  type="button"
                  disabled={togglingLike}
                  onClick={toggleLike}
                  className={`flex items-center gap-2 transition-all active:scale-95 ${liked ? 'text-orange-600' : 'hover:text-orange-600'} disabled:opacity-60`}
                >
                  <span className="text-xl">❤️</span> {post.likeCount ?? 0}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xl">💬</span> {post.commentCount ?? comments.length}
                </div>
              </div>

              <div className="mt-8">
                <div className="text-sm font-semibold text-gray-900">Comments ({comments.length})</div>

                <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-3 flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">U</div>
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full min-h-[64px] outline-none resize-none text-sm text-gray-700 placeholder:text-gray-400"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={submittingComment || !commentText.trim()}
                        onClick={submitComment}
                        className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors active:scale-[0.98]"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {comments.map((c, idx) => (
                    <div
                      key={c.id}
                      className="reveal bg-gray-50 border border-gray-100 rounded-2xl p-4"
                      data-revealed={animateIn ? 'true' : 'false'}
                      style={{ transitionDelay: `${Math.min(240, idx * 40)}ms` }}
                    >
                      <Link
                        href={routes.profile(c.authorId)}
                        className="group flex items-center gap-3"
                        aria-label={`View profile: ${displayAuthor(c.authorId)}`}
                        title={displayAuthor(c.authorId)}
                      >
                        <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 font-semibold transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                          {displayAuthor(c.authorId).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{displayAuthor(c.authorId)}</div>
                          <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
                        </div>
                      </Link>
                      <div className="mt-2 text-sm text-gray-700 leading-6">{c.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[80] bg-black/80 p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxUrl} alt="" className="w-full max-h-[82vh] object-contain rounded-2xl bg-black" />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <a
                href={lightboxUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-white text-gray-900 text-xs font-semibold active:scale-[0.98] transition-transform"
              >
                Download
              </a>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="px-3 py-2 rounded-xl bg-white/90 text-gray-900 text-xs font-semibold active:scale-[0.98] transition-transform"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
