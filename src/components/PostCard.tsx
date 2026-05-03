'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { routes } from '@/lib/routes';

interface PostCardProps {
  title: string;
  excerpt: string;
  author: string;
  authorId?: string;
  date: string;
  tags: string[];
  likes: number;
  comments: number;
  coverImageUrl?: string | null;
  status?: string | null;
  href?: Route;
  revealDelayMs?: number;
}

function isPublished(status?: string | null): boolean {
  if (!status) return true;
  const s = status.trim().toLowerCase();
  if (!s) return true;
  return s === 'published' || s === 'publish';
}

function isVideoUrl(url: string): boolean {
  return url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

export default function PostCard({ title, excerpt, author, authorId, date, tags, likes, comments, coverImageUrl, status, href, revealDelayMs }: PostCardProps) {
  const router = useRouter();
  const revealRef = useRef<HTMLDivElement | null>(null);
  const tiltAllowedRef = useRef(false);
  const draft = !isPublished(status);

  const delayStyle = useMemo(() => {
    const d = typeof revealDelayMs === 'number' && Number.isFinite(revealDelayMs) ? Math.max(0, revealDelayMs) : 0;
    return d ? ({ transitionDelay: `${Math.min(520, d)}ms` } as React.CSSProperties) : undefined;
  }, [revealDelayMs]);

  useEffect(() => {
    const el = revealRef.current;
    if (!el) return;
    if (typeof window === 'undefined') return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reducedMotion) {
      el.dataset.revealed = 'true';
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 1.1 && rect.bottom > -20) {
      el.dataset.revealed = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        el.dataset.revealed = 'true';
        observer.disconnect();
      },
      { root: null, rootMargin: '140px', threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    if (!mq) return;
    const sync = () => {
      tiltAllowedRef.current = mq.matches;
    };
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const card = (
    <div ref={revealRef} className="reveal" style={delayStyle} data-revealed="false">
      <article
        className="tilt-surface relative bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => {
          if (!href) return;
          router.push(href);
        }}
        onPointerMove={(e) => {
          if (!tiltAllowedRef.current) return;
          const target = e.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          const x = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
          const y = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
          const rx = (-y * 8).toFixed(2);
          const ry = (x * 10).toFixed(2);
          target.style.setProperty('--rx', `${rx}deg`);
          target.style.setProperty('--ry', `${ry}deg`);
          target.style.setProperty('--ts', '1.01');
        }}
        onPointerLeave={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.setProperty('--rx', '0deg');
          target.style.setProperty('--ry', '0deg');
          target.style.setProperty('--ts', '1');
        }}
        onPointerDown={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.setProperty('--ts', '0.985');
        }}
        onPointerUp={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.setProperty('--ts', tiltAllowedRef.current ? '1.01' : '1');
        }}
      >
      {coverImageUrl ? (
        <div className="mb-4 overflow-hidden rounded-xl bg-gray-100">
          {isVideoUrl(coverImageUrl) ? (
            <video src={coverImageUrl} className="w-full h-44 object-cover" muted playsInline controls />
          ) : (
            <img src={coverImageUrl} alt="" className="w-full h-44 object-cover transition-transform duration-500 ease-out hover:scale-[1.03]" />
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-3 mb-3">
        {authorId ? (
          <Link
            href={routes.profile(authorId)}
            onClick={(e) => e.stopPropagation()}
            className="group flex items-center gap-3"
            aria-label={`View profile: ${author}`}
            title={author}
          >
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              {author.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{author}</p>
              <p className="text-xs text-gray-500">{date}</p>
            </div>
          </Link>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold">
              {author.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{author}</p>
              <p className="text-xs text-gray-500">{date}</p>
            </div>
          </>
        )}
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{excerpt}</p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-col items-end gap-2">
          {draft ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-900 text-white text-[11px] font-semibold tracking-wide">
              DRAFT
            </span>
          ) : null}
          <div className="flex gap-4 text-gray-500 text-sm">
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-orange-500 transition-colors active:scale-95"
            >
              <span>❤️</span> {likes}
            </button>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-teal-500 transition-colors active:scale-95"
            >
              <span>💬</span> {comments}
            </button>
          </div>
        </div>
      </div>
      </article>
    </div>
  );

  return card;
}

export function PostCardSkeleton() {
  return (
    <article className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <div className="mb-4 overflow-hidden rounded-xl bg-gray-100">
        <div className="w-full h-40 skeleton fishbone" />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full skeleton" />
        <div className="flex-1">
          <div className="h-3 w-36 rounded skeleton" />
          <div className="mt-2 h-3 w-20 rounded skeleton" />
        </div>
      </div>

      <div className="h-5 w-3/4 rounded skeleton fishbone" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded skeleton" />
        <div className="h-3 w-5/6 rounded skeleton" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full skeleton" />
          <div className="h-6 w-20 rounded-full skeleton" />
        </div>
        <div className="flex gap-4">
          <div className="h-4 w-12 rounded skeleton" />
          <div className="h-4 w-12 rounded skeleton" />
        </div>
      </div>
    </article>
  );
}
