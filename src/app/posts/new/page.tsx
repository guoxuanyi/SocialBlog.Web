'use client';

import React, { useMemo, useState } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { apiPost, apiPostJson } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export default function NewPostPage() {
  const router = useRouter();
  const { state } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tagsText, setTagsText] = useState('#adventure');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo(() => {
    return tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t.slice(1) : t));
  }, [tagsText]);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const items = Array.from(files).slice(0, 6);
    const results: Attachment[] = [];

    for (const file of items) {
      if (file.size > 3 * 1024 * 1024) {
        setError('单个附件请小于 3MB');
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });

      if (!dataUrl) continue;
      results.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      });
    }

    if (results.length === 0) return;
    setAttachments((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      for (const a of results) map.set(a.id, a);
      return Array.from(map.values());
    });

    if (!coverImageUrl.trim()) {
      const firstImage = results.find((a) => a.type.startsWith('image/'));
      if (firstImage) setCoverImageUrl(firstImage.dataUrl);
    }
  }

  async function publish() {
    if (state.status !== 'authenticated') {
      router.push(`${routes.auth.login()}?next=${encodeURIComponent(routes.posts.new())}`);
      return;
    }

    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle || !nextContent) {
      setError('标题和正文不能为空');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await apiPostJson<
        { id?: string; Id?: string; postId?: string },
        { title: string; content: string; authorId: string; coverImageUrl?: string | null; tags: string[] }
      >(
        '/api/Posts',
        {
          title: nextTitle,
          content: nextContent,
          authorId: state.user.id,
          coverImageUrl: coverImageUrl.trim() ? coverImageUrl.trim() : null,
          tags,
        }
      );

      const postId = created.id ?? created.Id ?? created.postId;
      if (!postId) throw new Error('postId is missing');
      await apiPost<{ id: string }>(`/api/Posts/${postId}/publish`);
      router.push(routes.posts.detail(postId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header
        title="Discover"
        mode="discover"
        showBack={false}
        showSearch={false}
        showPublish={true}
        publishDisabled={submitting}
        onPublish={publish}
      />
      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4 space-y-4">
        {error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">{error}</div>
        ) : null}

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
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void addFiles(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
              Upload
            </label>
            <button type="button" className="h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-semibold">
              Video
            </button>
            <button type="button" className="h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-semibold">
              Location
            </button>
          </div>
          <div className="mt-4 border-2 border-dashed border-gray-200 rounded-2xl p-6">
            <div className="text-sm font-semibold text-gray-900">Cover</div>
            <div className="mt-2 text-sm text-gray-500">支持上传图片或粘贴 URL。</div>
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
                        <img src={a.dataUrl} alt="" className="w-full h-28 object-cover" />
                      ) : (
                        <div className="h-28 bg-gray-50 flex items-center justify-center text-xs text-gray-500">{a.name}</div>
                      )}
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-900 truncate">{a.name}</div>
                          <div className="text-[11px] text-gray-500">{Math.ceil(a.size / 1024)} KB</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.type.startsWith('image/') ? (
                            <button
                              type="button"
                              onClick={() => setContent((prev) => `${prev}${prev ? '\n\n' : ''}![${a.name}](${a.dataUrl})`)}
                              className="px-3 py-1 rounded-full bg-gray-900 text-white text-[11px] font-semibold hover:bg-gray-800 active:scale-95 transition-transform"
                            >
                              Insert
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
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
      <BottomNav />
    </div>
  );
}
