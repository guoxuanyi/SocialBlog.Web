'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { routes } from '@/lib/routes';
import { updateMe } from '@/lib/api';

export default function EditProfilePage() {
  const router = useRouter();
  const { state, refresh } = useAuth();

  const initial = useMemo(() => {
    if (state.status !== 'authenticated') return { displayName: '', bio: '', avatarUrl: '' };
    return {
      displayName: state.user.displayName ?? '',
      bio: state.user.bio ?? '',
      avatarUrl: state.user.avatarUrl ?? '',
    };
  }, [state]);

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status !== 'authenticated') router.replace(routes.auth.login());
  }, [router, state.status]);

  useEffect(() => {
    setDisplayName(initial.displayName);
    setBio(initial.bio);
    setAvatarUrl(initial.avatarUrl);
  }, [initial.avatarUrl, initial.bio, initial.displayName]);

  async function save() {
    if (state.status !== 'authenticated' || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateMe({
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      await refresh();
      setSaved(true);
      router.replace(routes.profile(state.user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Edit Profile" mode="detail" showBack={true} showSearch={false} />

      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          {error ? (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">{error}</div>
          ) : null}
          {saved ? (
            <div className="mb-4 bg-green-50 border border-green-100 rounded-2xl p-4 text-sm text-green-700">已保存</div>
          ) : null}

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
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
                placeholder="https://..."
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
