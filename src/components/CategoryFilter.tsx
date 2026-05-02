'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';
import type { Route } from 'next';

type FeedTab = 'forYou' | 'following';

type CategoryFilterProps = {
  tab: FeedTab;
  category: string;
  query?: string;
};

const categories = ['Trending', 'City Guides', 'Solo Travel', 'Photography', 'Food', 'Tech'];
const searchSuggestions = ['Trending', 'City Guides', 'Solo Travel', 'Photography', 'Food', 'Tech', 'AI', 'Design', 'Next.js', 'Product', 'Writing'];

function buildHomeHref(tab: FeedTab, category: string): Route {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (category && category !== 'Trending') params.set('category', category);
  const qs = params.toString();
  return (qs ? `/?${qs}` : '/') as Route;
}

export default function CategoryFilter({ tab, category, query }: CategoryFilterProps) {
  const router = useRouter();
  const [input, setInput] = useState(query ?? '');
  const nextHref = useMemo(() => {
    const q = input.trim();
    return q ? (`${routes.search()}?q=${encodeURIComponent(q)}` as unknown as Route) : (routes.search() as unknown as Route);
  }, [input]);

  useEffect(() => {
    setInput(query ?? '');
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="bg-gray-50 border border-gray-100 rounded-full p-1 flex gap-1">
          <Link
            href={buildHomeHref('forYou', category)}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'forYou' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            For You
          </Link>
          <Link
            href={buildHomeHref('following', category)}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'following' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            Following
          </Link>
        </div>
      </div>

      <form
        className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3"
        action={routes.search()}
        method="GET"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(nextHref);
        }}
      >
        <span className="text-teal-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </span>
        <input
          name="q"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          list="home-search-suggestions"
          placeholder="Explore hidden paths, city guides..."
          className="w-full outline-none text-sm text-gray-700 placeholder:text-gray-400"
          autoComplete="on"
        />
        <datalist id="home-search-suggestions">
          {searchSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </form>

      <div className="overflow-x-auto flex items-center gap-2 hide-scrollbar">
        {categories.map((cat) => {
          const active = cat === category;
          return (
            <Link
              key={cat}
              href={buildHomeHref(tab, cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${active
                  ? 'bg-orange-50 border-orange-100 text-orange-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              {cat}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
