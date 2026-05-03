'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { useToast } from '@/components/ToastProvider';
import { toUserErrorMessage } from '@/shared/api';

export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const toast = useToast();

  useEffect(() => {
    toast.push({ kind: 'error', message: toUserErrorMessage(error, '页面出错了') });
  }, [error, toast]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900">出现了一点问题</h1>
        <p className="mt-2 text-sm text-gray-600">你可以重试一次，或返回首页继续浏览。</p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="px-5 py-2 rounded-full bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
            onClick={() => unstable_retry()}
          >
            重试
          </button>
          <Link
            href={routes.home()}
            className="px-5 py-2 rounded-full bg-gray-100 text-gray-900 font-medium hover:bg-gray-200 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
