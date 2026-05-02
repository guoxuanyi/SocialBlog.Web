import Link from 'next/link';
import { routes } from '@/lib/routes';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">页面不存在</h1>
        <p className="mt-2 text-sm text-gray-600">你访问的地址可能已被移除或输入有误。</p>
        <Link
          href={routes.home()}
          className="inline-flex mt-6 px-5 py-2 rounded-full bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}

