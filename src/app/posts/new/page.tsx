'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { apiGet, apiPost, apiPostForm, apiPostJson, apiPutJson, toUserErrorMessage, type PostDto } from '@/shared/api';
import { routes } from '@/lib/routes';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import type { Route } from 'next';
import { useToast } from '@/components/ToastProvider';

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl: string;
  dataUrl?: string;
  objectUrl?: string;
};

function isVideoUrl(url: string): boolean {
  return url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

function NewPostInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useAuth();
  const toast = useToast();
  const draftFromUrl = (searchParams.get('draft') ?? '').trim();
  const fromParam = (searchParams.get('from') ?? '').trim();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [tagsText, setTagsText] = useState('#adventure');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [draftId, setDraftId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [leavePrompt, setLeavePrompt] = useState<null | { mode: 'back' | 'route'; href?: Route }>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const exitHrefRef = useRef<Route>(routes.home());
  const objectUrlsRef = useRef<Set<string>>(new Set());

  function markHomeNeedsRefresh() {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem('sb:home:needs_refresh', '1');
    } catch {}
  }

  const tags = useMemo(() => {
    return tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t.slice(1) : t));
  }, [tagsText]);

  const dirty = useMemo(() => {
    const hasText = Boolean(title.trim() || content.trim() || coverImageUrl.trim());
    const hasAttach = attachments.length > 0;
    const hasTags = tagsText.trim() !== '#adventure' && tagsText.trim() !== '';
    return hasText || hasAttach || hasTags;
  }, [attachments.length, content, coverImageUrl, tagsText, title]);

  useEffect(() => {
    const next = coverImageUrl.trim();
    if (next) {
      setCoverPreviewUrl(next);
      return;
    }
    setCoverPreviewUrl((prev) => (prev.trim().startsWith('blob:') ? prev : ''));
  }, [coverImageUrl]);

  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      objectUrlsRef.current.clear();
    };
  }, []);

  function normalizeExitHref(raw: string): Route {
    const value = raw.trim();
    if (!value) return routes.home();
    if (!value.startsWith('/')) return routes.home();
    if (value.startsWith('/posts/new')) return routes.home();
    return value as Route;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const prev = window.sessionStorage.getItem('sb:nav:previous') ?? '';
      exitHrefRef.current = normalizeExitHref(fromParam || prev);
    } catch {
      exitHrefRef.current = routes.home();
    }
  }, [fromParam]);

  useEffect(() => {
    let cancelled = false;
    async function loadDraft() {
      if (!draftFromUrl) return;
      if (state.status !== 'authenticated') return;
      try {
        const p = await apiGet<PostDto>(`/api/Posts/${encodeURIComponent(draftFromUrl)}`, { cache: 'no-store' });
        if (cancelled) return;
        setDraftId(p.id);
        setTitle(p.title ?? '');
        setContent(p.content ?? '');
        setCoverImageUrl(p.coverImageUrl ?? '');
        setTagsText((p.tags ?? []).length ? (p.tags ?? []).map((x) => `#${x}`).join(', ') : '#adventure');
      } catch (e) {
        if (!cancelled) toast.push({ kind: 'error', message: toUserErrorMessage(e, '加载草稿失败') });
      }
    }
    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftFromUrl, state.status]);

  const saveDraft = useCallback(async (): Promise<string> => {
    if (state.status !== 'authenticated') {
      try {
        const next = `${routes.posts.new()}?draft=${encodeURIComponent(draftId || draftFromUrl || '')}`;
        window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next } }));
      } catch {}
      throw new Error('Not authenticated');
    }

    const nextTitle = title.trim() || 'Untitled';
    const nextContent = content.trim() || '...';
    setSavingDraft(true);
    try {
      const body = {
        title: nextTitle,
        content: nextContent,
        authorId: state.user.id,
        coverImageUrl: coverImageUrl.trim() ? coverImageUrl.trim() : null,
        tags,
      };

      if (draftId) {
        await apiPutJson<object, typeof body>(`/api/Posts/${encodeURIComponent(draftId)}`, body);
        return draftId;
      }

      const created = await apiPostJson<{ id?: string; Id?: string; postId?: string }, typeof body>('/api/Posts', body);
      const id = created.id ?? created.Id ?? created.postId;
      if (!id) throw new Error('postId is missing');
      setDraftId(id);
      return id;
    } finally {
      setSavingDraft(false);
    }
  }, [content, coverImageUrl, draftFromUrl, draftId, router, state.status, state.user?.id, tags, title]);

  async function saveOnly() {
    try {
      const id = await saveDraft();
      markHomeNeedsRefresh();
      toast.push({ kind: 'success', message: '已保存到草稿' });
      return id;
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (/not authenticated/i.test(raw)) return '';
      toast.push({ kind: 'error', message: toUserErrorMessage(e, '保存草稿失败') });
      return '';
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function leaveEditorNow() {
    const href = exitHrefRef.current as unknown as string;
    try {
      window.location.replace(href);
    } catch {
      router.replace(exitHrefRef.current);
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const items = Array.from(files).slice(0, 6);
    const results: Attachment[] = [];

    for (const file of items) {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      let objectUrl = '';
      try {
        objectUrl = URL.createObjectURL(file);
        objectUrlsRef.current.add(objectUrl);
      } catch {}

      let dataUrl: string | undefined;
      if (file.size <= 3 * 1024 * 1024) {
        try {
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ''));
            reader.onerror = () => reject(new Error('读取文件失败'));
            reader.readAsDataURL(file);
          });
        } catch (e) {
          toast.push({ kind: 'error', message: toUserErrorMessage(e, '读取文件失败') });
        }
      }

      const previewUrl = dataUrl || objectUrl;
      if (!previewUrl) continue;

      results.push({ id, name: file.name, type: file.type, size: file.size, previewUrl, dataUrl, objectUrl });
    }

    if (results.length === 0) return;
    setAttachments((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      for (const a of results) map.set(a.id, a);
      return Array.from(map.values());
    });

    if (!coverImageUrl.trim()) {
      const firstImage = results.find((a) => a.type.startsWith('image/'));
      if (firstImage?.dataUrl) setCoverImageUrl(firstImage.dataUrl);
      if (firstImage?.previewUrl) setCoverPreviewUrl(firstImage.previewUrl);
    }
  }

  async function publish() {
    if (state.status !== 'authenticated') {
      try {
        window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next: routes.posts.new() } }));
      } catch {}
      return;
    }

    setSubmitting(true);
    try {
      const id = await saveDraft();
      await apiPost<{ id: string }>(`/api/Posts/${encodeURIComponent(id)}/publish`);
      markHomeNeedsRefresh();
      router.push(routes.posts.detail(id));
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (!/not authenticated/i.test(raw)) {
        toast.push({ kind: 'error', message: toUserErrorMessage(e, '发布失败') });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header
        title="Discover"
        mode="discover"
        showBack={true}
        onBack={() => {
          if (dirty) setLeavePrompt({ mode: 'back' });
          else leaveEditorNow();
        }}
        showSearch={false}
        showPublish={false}
      />
      <div className="fixed right-4 top-20 md:right-6 z-[60] flex items-center gap-2">
        <button
          type="button"
          disabled={savingDraft || submitting || uploadingCover}
          onClick={() => void saveOnly()}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform inline-flex items-center justify-center"
          aria-label="保存草稿"
          title="保存草稿"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h9l3 3v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-8H8v8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v6h7" />
          </svg>
        </button>
        <button
          type="button"
          disabled={submitting || savingDraft || uploadingCover}
          onClick={() => void publish()}
          className="w-10 h-10 rounded-full bg-orange-600 text-white shadow-sm hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform inline-flex items-center justify-center"
          aria-label="发布"
          title="发布"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L6 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter an inspiring title"
            className="w-full text-2xl font-extrabold tracking-tight outline-none placeholder:text-gray-200"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell your story. Where did you go? What did you discover?"
            className="mt-4 w-full min-h-[280px] text-sm leading-6 outline-none resize-none placeholder:text-gray-300"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-sm font-semibold text-gray-900">Add to your post</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <label className="h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-semibold inline-flex items-center justify-center cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-transform">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void addFiles(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
              Upload
            </label>
            <label className="h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-semibold inline-flex items-center justify-center cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-transform">
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void addFiles(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
              Video
            </label>
            <button type="button" className="h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-semibold">
              Location
            </button>
          </div>
          <div className="mt-4 border-2 border-dashed border-gray-200 rounded-2xl p-6">
            <div className="text-sm font-semibold text-gray-900">Cover</div>
            <div className="mt-2 text-sm text-gray-500">支持上传图片或粘贴 URL。</div>
            <div className="mt-3">
              <label className="h-10 px-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-semibold inline-flex items-center justify-center cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-transform">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = '';
                    if (!f) return;
                    if (state.status !== 'authenticated') {
                      try {
                        window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'login', next: routes.posts.new() } }));
                      } catch {}
                      return;
                    }
                    setUploadingCover(true);
                    try {
                      const form = new FormData();
                      form.append('file', f);
                      const res = await apiPostForm<{ url: string }>('/api/Posts/media', form);
                      setCoverImageUrl(res.url);
                    } catch {
                    } finally {
                      setUploadingCover(false);
                    }
                  }}
                />
                {uploadingCover ? 'Uploading…' : 'Upload Cover'}
              </label>
            </div>
            {coverPreviewUrl.trim() ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                {isVideoUrl(coverPreviewUrl.trim()) ? (
                  <video src={coverPreviewUrl.trim()} className="w-full h-48 object-cover" controls playsInline />
                ) : (
                  <img src={coverPreviewUrl.trim()} alt="" className="w-full h-48 object-cover" />
                )}
              </div>
            ) : null}
            <input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://... 或 data:image/..."
              className="mt-3 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-700 placeholder:text-gray-400"
            />

            {attachments.length ? (
              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-900">Attachments</div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {attachments.map((a) => (
                    <div key={a.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                      {a.type.startsWith('image/') ? (
                        <img src={a.previewUrl} alt="" className="w-full h-28 object-cover" />
                      ) : a.type.startsWith('video/') ? (
                        <video src={a.previewUrl} className="w-full h-28 object-cover" muted playsInline controls />
                      ) : (
                        <div className="h-28 bg-gray-50 flex items-center justify-center text-xs text-gray-500">{a.name}</div>
                      )}
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-900 truncate">{a.name}</div>
                          <div className="text-[11px] text-gray-500">{Math.ceil(a.size / 1024)} KB</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.type.startsWith('image/') && a.dataUrl ? (
                            <button
                              type="button"
                              onClick={() => setContent((prev) => `${prev}${prev ? '\n\n' : ''}![${a.name}](${a.dataUrl})`)}
                              className="px-3 py-1 rounded-full bg-gray-900 text-white text-[11px] font-semibold hover:bg-gray-800 active:scale-95 transition-transform"
                            >
                              Insert
                            </button>
                          ) : a.type.startsWith('video/') && a.dataUrl ? (
                            <button
                              type="button"
                              onClick={() => setContent((prev) => `${prev}${prev ? '\n\n' : ''}<video src="${a.dataUrl}" controls></video>`)}
                              className="px-3 py-1 rounded-full bg-gray-900 text-white text-[11px] font-semibold hover:bg-gray-800 active:scale-95 transition-transform"
                            >
                              Insert
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              if (a.objectUrl) {
                                try {
                                  URL.revokeObjectURL(a.objectUrl);
                                } catch {}
                                objectUrlsRef.current.delete(a.objectUrl);
                                if (coverPreviewUrl === a.objectUrl) setCoverPreviewUrl('');
                              }
                              setAttachments((prev) => prev.filter((x) => x.id !== a.id));
                            }}
                            className="w-8 h-8 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-transform inline-flex items-center justify-center"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-sm font-semibold text-gray-900">Categorize</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-semibold">
                #{t}
              </span>
            ))}
          </div>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="#adventure, city guides"
            className="mt-3 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-700 placeholder:text-gray-400"
          />

          <div className="mt-4 text-sm font-semibold text-gray-900">Visibility</div>
          <div className="mt-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700">
            Public Discovery
          </div>
        </div>
      </main>
      {leavePrompt ? (
        <div className="fixed inset-0 z-[90] bg-black/40 p-4 flex items-end md:items-center justify-center" onClick={() => setLeavePrompt(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="text-base font-extrabold text-gray-900">离开编辑？</div>
              <div className="mt-2 text-sm text-gray-600">要将内容保存到草稿箱吗？</div>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  disabled={savingDraft}
                  onClick={async () => {
                    try {
                      await saveDraft();
                      markHomeNeedsRefresh();
                      setLeavePrompt(null);
                      leaveEditorNow();
                    } catch (e) {
                      toast.push({ kind: 'error', message: toUserErrorMessage(e, '保存草稿失败') });
                    }
                  }}
                  className="w-full h-11 rounded-2xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  保存草稿
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLeavePrompt(null);
                    leaveEditorNow();
                  }}
                  className="w-full h-11 rounded-2xl border border-gray-200 bg-white text-gray-800 font-semibold hover:bg-gray-50 active:scale-[0.99] transition-transform"
                >
                  不保存
                </button>
                <button
                  type="button"
                  onClick={() => setLeavePrompt(null)}
                  className="w-full h-11 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 font-semibold hover:bg-gray-100 active:scale-[0.99] transition-transform"
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

function NewPostFallback() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header title="Discover" mode="discover" showBack={true} showSearch={false} showPublish={true} publishDisabled={true} />
      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="h-8 w-3/4 rounded skeleton fishbone" />
          <div className="mt-4 h-40 w-full rounded skeleton" />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="h-4 w-40 rounded skeleton" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl skeleton" />
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

export default function NewPostPage() {
  return (
    <Suspense fallback={<NewPostFallback />}>
      <NewPostInner />
    </Suspense>
  );
}
