'use client';

import Link from 'next/link';
import React from 'react';
import type { Route } from 'next';

type FeedTab = 'forYou' | 'following';

type CategoryFilterProps = {
  tab: FeedTab;
  category: string;
};

const categories = ['Trending', 'City Guides', 'Solo Travel', 'Photography', 'Food', 'Tech'];

function buildHomeHref(tab: FeedTab, category: string): Route {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (category && category !== 'Trending') params.set('category', category);
  const qs = params.toString();
  return (qs ? `/?${qs}` : '/') as Route;
}

export default function CategoryFilter({ tab, category }: CategoryFilterProps) {
  return (
    <div className="space-y-3">
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
