'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { routes } from '@/lib/routes';
import { apiPostForm, getMe, toUserErrorMessage, updateMe } from '@/shared/api';
import { useToast } from '@/components/ToastProvider';

export default function EditProfilePage() {
  const router = useRouter();
  const { state, refresh } = useAuth();
  const toast = useToast();

  const initial = useMemo(() => {
    if (state.status !== 'authenticated') return { displayName: '', bio: '', avatarUrl: '', coverImageUrl: '' };
    return {
      displayName: state.user.displayName ?? '',
      bio: state.user.bio ?? '',
      avatarUrl: state.user.avatarUrl ?? '',
      coverImageUrl: state.user.coverImageUrl ?? '',
    };
  }, [state]);

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status !== 'authenticated') router.replace(routes.auth.login());
  }, [router, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated') return;
    try {
      const prev = (window.sessionStorage.getItem('sb:nav:previous') ?? '').trim();
      if (!prev.startsWith('/profile/')) router.replace(routes.profile(state.user.id));
    } catch {
      router.replace(routes.profile(state.user.id));
    }
  }, [router, state.status, state.user?.id]);

  useEffect(() => {
    setDisplayName(initial.displayName);
    setBio(initial.bio);
    setAvatarUrl(initial.avatarUrl);
    setCoverImageUrl(initial.coverImageUrl);
  }, [initial.avatarUrl, initial.bio, initial.displayName, initial.coverImageUrl]);

  async function uploadMedia(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiPostForm<{ url: string }>('/api/Posts/media', form);
    return res.url;
  }

  function isVideoUrl(url: string): boolean {
    return url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
  }

  async function save() {
    if (state.status !== 'authenticated' || saving) return;
    setSaving(true);
    try {
      const nextAvatar = avatarUrl.trim() || null;
      const nextCover = coverImageUrl.trim() || null;
      await updateMe({
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: nextAvatar,
        coverImageUrl: nextCover,
      });
      await refresh();
      const verified = await getMe();
      const okAvatar = (verified.avatarUrl ?? null) === nextAvatar;
      const okCover = (verified.coverImageUrl ?? null) === nextCover;
      if (!okAvatar || !okCover) {
        throw new Error('保存未生效（后端未返回最新头像/背景图）');
      }
      toast.push({ kind: 'success', message: '已保存' });
      router.replace(routes.profile(state.user.id));
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (/保存未生效/.test(raw)) {
        toast.push({ kind: 'error', message: toUserErrorMessage(e, '保存失败') });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Edit Profile" mode="detail" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-900">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="Alex Explorer"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900 min-h-[120px] resize-none"
                placeholder="Say something about yourself…"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">Avatar URL</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                  {avatarUrl.trim() ? (
                    isVideoUrl(avatarUrl.trim()) ? (
                      <video src={avatarUrl.trim()} className="w-full h-full object-cover" muted playsInline controls />
                    ) : (
                      <img src={avatarUrl.trim()} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <span className="text-gray-500 text-xs">No</span>
                  )}
                </div>
                <label className="h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-semibold inline-flex items-center justify-center cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-transform">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.currentTarget.value = '';
                      if (!f) return;
                      try {
                        const url = await uploadMedia(f);
                        setAvatarUrl(url);
                      } catch {
                      }
                    }}
                  />
                  Upload
                </label>
              </div>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">Cover image URL</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-24 h-14 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                  {coverImageUrl.trim() ? (
                    isVideoUrl(coverImageUrl.trim()) ? (
                      <video src={coverImageUrl.trim()} className="w-full h-full object-cover" muted playsInline controls />
                    ) : (
                      <img src={coverImageUrl.trim()} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <span className="text-gray-500 text-xs">No</span>
                  )}
                </div>
                <label className="h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-semibold inline-flex items-center justify-center cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-transform">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.currentTarget.value = '';
                      if (!f) return;
                      try {
                        const url = await uploadMedia(f);
                        setCoverImageUrl(url);
                      } catch {
                      }
                    }}
                  />
                  Upload
                </label>
              </div>
              <input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="https://... 或 data:image/..."
              />
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="w-full px-4 py-3 rounded-xl bg-orange-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
            >
              Save changes
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
