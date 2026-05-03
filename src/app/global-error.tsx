'use client';

import React, { useEffect } from 'react';
import { toUserErrorMessage } from '@/shared/api';
import './globals.css';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-900">系统异常</h1>
          <p className="mt-2 text-sm text-gray-600">{toUserErrorMessage(error, '服务开小差了，请稍后重试')}</p>
          <button
            type="button"
            className="mt-6 px-5 py-2 rounded-full bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
            onClick={() => unstable_retry()}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}

