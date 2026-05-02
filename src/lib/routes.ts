import type { Route } from 'next';

export const routes = {
  home: () => '/' as Route,
  explore: () => '/search' as Route,
  create: () => '/posts/new' as Route,
  inbox: () => '/activity' as Route,
  auth: {
    login: () => '/login' as Route,
    register: () => '/register' as Route,
  },
  settings: {
    index: () => '/settings' as Route,
    profile: () => '/settings/profile' as Route,
    security: () => '/settings/security' as Route,
  },
  posts: {
    new: () => '/posts/new' as Route,
    detail: (id: string | number) => `/posts/${id}` as Route,
  },
  search: () => '/search' as Route,
  activity: () => '/activity' as Route,
  profile: (username: string) => `/profile/${encodeURIComponent(username)}` as Route,
};
