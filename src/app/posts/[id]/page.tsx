'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { apiDelete, apiGet, apiPost, apiPostForm, apiPostJson, displayAuthor, isObjectId, toUserErrorMessage, type CommentDto, type PaginatedResponse, type PostDto } from '@/shared/api';
import { useAuth } from '@/components/AuthProvider';
import { routes } from '@/lib/routes';
import { useToast } from '@/components/ToastProvider';
import { useParams } from 'next/navigation';

function isVideoUrl(url: string): boolean {
  return url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

function isImageUrl(url: string): boolean {
  return url.startsWith('data:image/') || /\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(url);
}

function extractUrls(text: string): string[] {
  const re = /(https?:\/\/[^\s<>"')\]]+)/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

function renderRichText(text: string, onOpenImage: (url: string) => void): React.ReactNode {
  const lines = text.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const urls = extractUrls(line);
        const onlyUrl = urls.length === 1 && line.trim() === urls[0];
        if (onlyUrl && isImageUrl(urls[0])) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenImage(urls[0])}
              className="block w-full overflow-hidden rounded-2xl bg-gray-100 border border-gray-200"
              aria-label="View image"
            >
              <img src={urls[0]} alt="" className="w-full max-h-[340px] object-contain bg-black" />
            </button>
          );
        }
        if (onlyUrl && isVideoUrl(urls[0])) {
          return <video key={idx} src={urls[0]} className="w-full rounded-2xl bg-gray-100 border border-gray-200" controls playsInline />;
        }

        const parts: React.ReactNode[] = [];
        const re = /(https?:\/\/[^\s<>"')\]]+)/gi;
        let last = 0;
        let match: RegExpExecArray | null;
        while ((match = re.exec(line))) {
          const start = match.index;
          const end = start + match[1].length;
          if (start > last) parts.push(line.slice(last, start));
          const url = match[1];
          parts.push(
            <a key={`${idx}-${start}`} href={url} target="_blank" rel="noreferrer" className="text-orange-600 underline underline-offset-4 break-all">
              {url}
            </a>
          );
          last = end;
        }
        if (last < line.length) parts.push(line.slice(last));
        return (
          <p key={idx} className="text-sm text-gray-700 leading-6 whitespace-pre-wrap break-words">
            {parts.length ? parts : line}
          </p>
        );
      })}
    </div>
  );
}

export default function PostDetail() {
  const { state } = useAuth();
  const toast = useToast();
  const params = useParams();
  const rawId = (params as { id?: string | string[] } | null)?.id;
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
  const userId = state.status === 'authenticated' ? state.user.id : '';

  const [post, setPost] = useState<PostDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentMedia, setCommentMedia] = useState<Array<{ url: string; contentType?: string }>>([]);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyMedia, setReplyMedia] = useState<Array<{ url: string; contentType?: string }>>([]);
  const [deleteConfirmCommentId, setDeleteConfirmCommentId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploadingCommentMedia, setUploadingCommentMedia] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [uploadingReplyMedia, setUploadingReplyMedia] = useState(false);
  const [deletingComment, setDeletingComment] = useState(false);
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
        toast.push({ kind: 'error', message: '文章不存在' });
        setLoading(false);
        return;
      }
      setLoading(true);
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
        if (cancelled) return;
        setPost(null);
        setComments([]);
        setLiked(false);
        toast.push({ kind: 'error', message: toUserErrorMessage(e, '加载失败') });
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

  const commentTree = useMemo(() => {
    type Node = CommentDto & { children: Node[] };
    const map = new Map<string, Node>();
    for (const c of comments) {
      map.set(c.id, { ...c, children: [] });
    }
    const roots: Node[] = [];
    for (const node of map.values()) {
      const pid = node.parentCommentId ?? null;
      if (pid && map.has(pid)) map.get(pid)!.children.push(node);
      else roots.push(node);
    }
    const byDate = (a: Node, b: Node) => +new Date(a.createdAt) - +new Date(b.createdAt);
    const sortRec = (nodes: Node[]) => {
      nodes.sort(byDate);
      for (const n of nodes) sortRec(n.children);
    };
    sortRec(roots);
    return roots;
  }, [comments]);

  async function uploadCommentMedia(file: File) {
    if (state.status !== 'authenticated') {
      if (id && isObjectId(id)) {
        try {
          window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next: routes.posts.detail(id) } }));
        } catch {}
      }
      return;
    }
    setUploadingCommentMedia(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiPostForm<{ url: string; contentType?: string }>('/api/Posts/media', form);
      if (res.url) setCommentMedia((prev) => [...prev, { url: res.url, contentType: res.contentType }]);
    } catch {
    } finally {
      setUploadingCommentMedia(false);
    }
  }

  async function uploadReplyMedia(file: File) {
    if (state.status !== 'authenticated') {
      if (id && isObjectId(id)) {
        try {
          window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next: routes.posts.detail(id) } }));
        } catch {}
      }
      return;
    }
    setUploadingReplyMedia(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiPostForm<{ url: string; contentType?: string }>('/api/Posts/media', form);
      if (res.url) setReplyMedia((prev) => [...prev, { url: res.url, contentType: res.contentType }]);
    } catch {
    } finally {
      setUploadingReplyMedia(false);
    }
  }

  async function refreshPostAndComments() {
    if (!id || !isObjectId(id)) return;
    try {
      const c = await apiGet<PaginatedResponse<CommentDto>>(`/api/Posts/${encodeURIComponent(id)}/comments?skip=0&limit=50`, { cache: 'no-store' });
      setComments(c.data);
    } catch (e) {
      toast.push({ kind: 'error', message: toUserErrorMessage(e, '刷新评论失败') });
    }
    try {
      const p = await apiGet<PostDto>(`/api/Posts/${encodeURIComponent(id)}`, { cache: 'no-store' });
      setPost(p);
    } catch (e) {
      toast.push({ kind: 'error', message: toUserErrorMessage(e, '刷新文章失败') });
    }
  }

  async function deleteComment(commentId: string) {
    if (!id || !isObjectId(id)) return;
    if (state.status !== 'authenticated') {
      try {
        window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next: routes.posts.detail(id) } }));
      } catch {}
      return;
    }
    if (deletingComment) return;
    setDeletingComment(true);
    try {
      await apiDelete<object>(`/api/Posts/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`);
      const c = await apiGet<PaginatedResponse<CommentDto>>(`/api/Posts/${encodeURIComponent(id)}/comments?skip=0&limit=50`, { cache: 'no-store' });
      setComments(c.data);
      const p = await apiGet<PostDto>(`/api/Posts/${encodeURIComponent(id)}`, { cache: 'no-store' });
      setPost(p);
    } catch {
    } finally {
      setDeletingComment(false);
    }
  }

  async function toggleLike() {
    if (!id || !isObjectId(id)) return;
    if (state.status !== 'authenticated') {
      try {
        window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next: routes.posts.detail(id) } }));
      } catch {}
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
    } catch {
    } finally {
      setTogglingLike(false);
    }
  }

  async function submitComment() {
    if (!id || !isObjectId(id)) return;
    if (state.status !== 'authenticated') {
      try {
        window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next: routes.posts.detail(id) } }));
      } catch {}
      return;
    }
    const text = commentText.trim();
    if ((!text && commentMedia.length === 0) || submittingComment || uploadingCommentMedia) return;
    setSubmittingComment(true);
    try {
      const content = [text, ...commentMedia.map((m) => m.url)].filter((x) => x.trim()).join('\n');
      await apiPostJson<object, { authorId: string; content: string; parentCommentId: string | null }>(
        `/api/Posts/${encodeURIComponent(id)}/comments`,
        { authorId: state.user.id, content, parentCommentId: null }
      );
      setCommentText('');
      setCommentMedia([]);
      await refreshPostAndComments();
    } catch {
    } finally {
      setSubmittingComment(false);
    }
  }

  async function submitReply() {
    if (!id || !isObjectId(id)) return;
    if (!replyToId) return;
    if (state.status !== 'authenticated') {
      try {
        window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next: routes.posts.detail(id) } }));
      } catch {}
      return;
    }
    const text = replyText.trim();
    if ((!text && replyMedia.length === 0) || submittingReply || uploadingReplyMedia) return;
    setSubmittingReply(true);
    try {
      const content = [text, ...replyMedia.map((m) => m.url)].filter((x) => x.trim()).join('\n');
      await apiPostJson<object, { authorId: string; content: string; parentCommentId: string | null }>(
        `/api/Posts/${encodeURIComponent(id)}/comments`,
        { authorId: state.user.id, content, parentCommentId: replyToId }
      );
      setReplyText('');
      setReplyMedia([]);
      setReplyToId(null);
      await refreshPostAndComments();
    } catch {
    } finally {
      setSubmittingReply(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Discover" mode="detail" showBack={true} showSearch={false} />
      {!loading && post ? (
        <div
          className="fixed left-0 right-0 top-14 h-0.5 bg-orange-500 origin-left z-40"
          style={{ transform: `scaleX(${progress})` }}
        />
      ) : null}

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-32 md:pb-10">
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
        ) : !post ? (
          <div className="p-4">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">内容不存在</div>
          </div>
        ) : (
          <div>
            {post.coverImageUrl ? (
              <div className="px-4 pt-4 md:px-0 md:pt-0">
                {isVideoUrl(post.coverImageUrl) ? (
                  <video src={post.coverImageUrl} className="w-full h-80 md:h-[420px] object-cover rounded-2xl bg-gray-100" controls playsInline />
                ) : (
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(post.coverImageUrl ?? null)}
                    className="w-full bg-gray-100 overflow-hidden rounded-2xl block"
                    aria-label="View image"
                  >
                    <img
                      src={post.coverImageUrl}
                      alt=""
                      className="w-full h-80 md:h-[420px] object-cover"
                      style={{ transform: `translateY(${coverShift}px)`, willChange: 'transform' }}
                    />
                  </button>
                )}
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
                <span
                  className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                    (post.status ?? '').toLowerCase() === 'published'
                      ? 'bg-teal-50 border-teal-100 text-teal-700'
                      : 'bg-gray-900 border-gray-900 text-white'
                  }`}
                >
                  {(post.status ?? 'Unknown').toUpperCase()}
                </span>
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
                {state.status === 'authenticated' && state.user.id === post.authorId ? (
                  <div className="flex items-center gap-2">
                    {String(post.status ?? '').toLowerCase() !== 'published' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await apiPost<object>(`/api/Posts/${encodeURIComponent(id)}/publish`);
                            try {
                              const p = await apiGet<PostDto>(`/api/Posts/${encodeURIComponent(id)}`, { cache: 'no-store' });
                              setPost(p);
                            } catch (e) {
                              toast.push({ kind: 'error', message: toUserErrorMessage(e, '刷新失败') });
                            }
                          } catch {
                          }
                        }}
                        className="w-11 h-11 rounded-full bg-orange-600 text-white inline-flex items-center justify-center hover:bg-orange-700 active:scale-95 transition-transform"
                        aria-label="Publish"
                        title="Publish"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L6 12Zm0 0h7.5" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-semibold border border-teal-100 active:scale-[0.98] transition-transform"
                  >
                    Follow
                  </button>
                )}
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

                <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-3">
                  {commentText.trim() || commentMedia.length ? (
                    <div className="pb-2 flex items-center justify-between">
                      <div className="text-xs text-gray-600">评论中</div>
                      <button
                        type="button"
                        onClick={() => {
                          setCommentText('');
                          setCommentMedia([]);
                        }}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 text-red-600 inline-flex items-center justify-center hover:bg-red-50 active:scale-95 transition-transform shrink-0"
                        aria-label="清空评论内容"
                        title="清空"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : null}
                  <div className="flex gap-3 items-start">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">
                      {state.status === 'authenticated' ? (state.user.username ?? 'U').charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full min-h-[64px] outline-none resize-none text-sm text-gray-700 placeholder:text-gray-400"
                      />
                      {commentMedia.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {commentMedia.map((m) => {
                            const isVid = (m.contentType ?? '').startsWith('video/') || isVideoUrl(m.url);
                            return (
                              <div key={m.url} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                                {isVid ? (
                                  <video src={m.url} className="w-full h-full object-cover" muted playsInline controls />
                                ) : (
                                  <button type="button" className="w-full h-full" onClick={() => setLightboxUrl(m.url)} aria-label="View image">
                                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setCommentMedia((prev) => prev.filter((x) => x.url !== m.url))}
                                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/70 active:scale-95 transition-transform"
                                  aria-label="Remove"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <label
                          className={`w-10 h-10 rounded-full border inline-flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
                            uploadingCommentMedia ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                          aria-label="上传图片或视频"
                          title="上传图片/视频"
                        >
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.currentTarget.value = '';
                              if (!f) return;
                              void uploadCommentMedia(f);
                            }}
                          />
                          {uploadingCommentMedia ? (
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.364-7.364-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.485 2.121 2.121m8.486 8.486 2.121 2.121" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16l4-4a3 3 0 0 1 4 0l6 6M14 14l2-2a3 3 0 0 1 4 0l1 1M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z"
                              />
                            </svg>
                          )}
                        </label>
                        <button
                          type="button"
                          disabled={submittingComment || uploadingCommentMedia || (!commentText.trim() && commentMedia.length === 0)}
                          onClick={submitComment}
                          className="w-10 h-10 rounded-full bg-orange-600 text-white inline-flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 active:scale-95 transition-transform"
                          aria-label="发送"
                          title="发送"
                        >
                          {submittingComment ? (
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.364-7.364-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.485 2.121 2.121m8.486 8.486 2.121 2.121" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h11m-4-4 4 4-4 4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {commentTree.map((root, idx) => {
                    type Node = typeof root;
                    const renderNode = (node: Node, depth: number): React.ReactNode => {
                      const pad = Math.min(36, depth * 14);
                      return (
                        <div key={node.id} style={{ marginLeft: pad }}>
                          <div
                            className={`reveal rounded-2xl p-4 border ${replyToId === node.id ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}
                            data-revealed={animateIn ? 'true' : 'false'}
                            style={{ transitionDelay: `${Math.min(240, idx * 40)}ms` }}
                          >
                            <Link
                              href={routes.profile(node.authorId)}
                              className="group flex items-center gap-3"
                              aria-label={`View profile: ${displayAuthor(node.authorId)}`}
                              title={displayAuthor(node.authorId)}
                            >
                              <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 font-semibold transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                                {displayAuthor(node.authorId).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{displayAuthor(node.authorId)}</div>
                                <div className="text-xs text-gray-500">{new Date(node.createdAt).toLocaleString()}</div>
                              </div>
                            </Link>
                            <div className="mt-2">{renderRichText(node.content, (url) => setLightboxUrl(url))}</div>
                            <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                              <div className="text-[11px] text-gray-500 font-semibold tabular-nums">
                                {node.children?.length ? `回复 ${node.children.length}` : ''}
                              </div>
                              <div className="flex items-center">
                                {state.status === 'authenticated' && (state.user.id === node.authorId || state.user.id === post?.authorId) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteConfirmCommentId(node.id);
                                    }}
                                    className="mr-2 w-10 h-10 rounded-full bg-white border border-gray-200 text-red-600 inline-flex items-center justify-center hover:bg-red-50 active:scale-95 transition-transform shrink-0"
                                    aria-label="删除"
                                    title="删除"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                      />
                                    </svg>
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyToId(node.id);
                                    setReplyText('');
                                    setReplyMedia([]);
                                  }}
                                  className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-700 shadow-sm inline-flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform shrink-0"
                                  aria-label="回复"
                                  title="回复"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10 4 15l5 5" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 4v7a4 4 0 0 1-4 4H4" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          {replyToId === node.id ? (
                            <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-3">
                              <div className="pb-2 flex items-center justify-between">
                                <div className="text-xs text-gray-600">
                                  回复给 <span className="font-semibold">{displayAuthor(node.authorId)}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyToId(null);
                                    setReplyText('');
                                    setReplyMedia([]);
                                  }}
                                  className="w-10 h-10 rounded-full bg-white border border-gray-200 text-red-600 inline-flex items-center justify-center hover:bg-red-50 active:scale-95 transition-transform shrink-0"
                                  aria-label="取消并清空回复"
                                  title="取消并清空"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="flex gap-3 items-start">
                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">
                                  {state.status === 'authenticated' ? (state.user.username ?? 'U').charAt(0).toUpperCase() : 'G'}
                                </div>
                                <div className="flex-1">
                                  <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="w-full min-h-[64px] outline-none resize-none text-sm text-gray-700 placeholder:text-gray-400"
                                  />
                                  {replyMedia.length ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {replyMedia.map((m) => {
                                        const isVid = (m.contentType ?? '').startsWith('video/') || isVideoUrl(m.url);
                                        return (
                                          <div key={m.url} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                                            {isVid ? (
                                              <video src={m.url} className="w-full h-full object-cover" muted playsInline controls />
                                            ) : (
                                              <button type="button" className="w-full h-full" onClick={() => setLightboxUrl(m.url)} aria-label="View image">
                                                <img src={m.url} alt="" className="w-full h-full object-cover" />
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => setReplyMedia((prev) => prev.filter((x) => x.url !== m.url))}
                                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/70 active:scale-95 transition-transform"
                                              aria-label="Remove"
                                              title="Remove"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                  <div className="mt-2 flex items-center justify-end gap-2">
                                    <label
                                      className={`w-10 h-10 rounded-full border inline-flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
                                        uploadingReplyMedia ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                      }`}
                                      aria-label="上传图片或视频"
                                      title="上传图片/视频"
                                    >
                                      <input
                                        type="file"
                                        accept="image/*,video/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          e.currentTarget.value = '';
                                          if (!f) return;
                                          void uploadReplyMedia(f);
                                        }}
                                      />
                                      {uploadingReplyMedia ? (
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.364-7.364-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.485 2.121 2.121m8.486 8.486 2.121 2.121" />
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M4 16l4-4a3 3 0 0 1 4 0l6 6M14 14l2-2a3 3 0 0 1 4 0l1 1M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z"
                                          />
                                        </svg>
                                      )}
                                    </label>
                                    <button
                                      type="button"
                                      disabled={submittingReply || uploadingReplyMedia || (!replyText.trim() && replyMedia.length === 0)}
                                      onClick={submitReply}
                                      className="w-10 h-10 rounded-full bg-orange-600 text-white inline-flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 active:scale-95 transition-transform"
                                      aria-label="发送"
                                      title="发送"
                                    >
                                      {submittingReply ? (
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.364-7.364-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.485 2.121 2.121m8.486 8.486 2.121 2.121" />
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h11m-4-4 4 4-4 4" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {node.children?.length ? <div className="mt-3 space-y-3">{node.children.map((ch) => renderNode(ch as Node, depth + 1))}</div> : null}
                        </div>
                      );
                    };
                    return renderNode(root, 0);
                  })}
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

      {deleteConfirmCommentId ? (
        <div
          className="fixed inset-0 z-[96] bg-black/40 p-4 flex items-end md:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setDeleteConfirmCommentId(null)}
        >
          <div className="w-full max-w-md bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="text-base font-extrabold text-gray-900">删除回复</div>
              <div className="mt-2 text-sm text-gray-600">确定删除这条回复吗？删除后不可恢复。</div>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  disabled={deletingComment}
                  onClick={() => {
                    const idToDelete = deleteConfirmCommentId;
                    setDeleteConfirmCommentId(null);
                    if (!idToDelete) return;
                    void deleteComment(idToDelete);
                  }}
                  className="w-full h-11 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  {deletingComment ? '删除中…' : '删除'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCommentId(null)}
                  className="w-full h-11 rounded-2xl border border-gray-200 bg-white text-gray-800 font-semibold hover:bg-gray-50 active:scale-[0.99] transition-transform"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
