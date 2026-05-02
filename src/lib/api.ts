type ResponseWrapper<T> = {
  success: boolean;
  message: string;
  data: T;
  code: number;
  timestamp: number;
};

type InnerApiResponse<T> = {
  successful: boolean;
  message: string;
  data: T | null;
  code: number;
  timestamp: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  skip: number;
  limit: number;
};

export type PostDto = {
  id: string;
  authorId: string;
  title: string;
  content: string;
  coverImageUrl?: string | null;
  tags: string[];
  status: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
};

export type CommentDto = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentCommentId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type TokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

export type UserProfileDto = {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export function resolveAuthorId(usernameOrId: string): string {
  if (isObjectId(usernameOrId)) return usernameOrId;
  return '';
}

export function displayAuthor(authorId: string): string {
  if (!authorId) return 'Unknown';
  return isObjectId(authorId) ? `${authorId.slice(0, 6)}…${authorId.slice(-4)}` : authorId;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
const ACCESS_TOKEN_KEY = 'socialblog.access_token';
const inflightGets = new Map<string, Promise<unknown>>();

function resolveRequestUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/api/') && API_BASE_URL) return `${API_BASE_URL}${path.slice(4)}`;
  return path;
}

function getPathnameFromUrl(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    const q = url.indexOf('?');
    const h = url.indexOf('#');
    const end = Math.min(q === -1 ? url.length : q, h === -1 ? url.length : h);
    return url.slice(0, end);
  }
}

function isUsersMeEndpoint(url: string): boolean {
  const pathname = getPathnameFromUrl(url);
  const needle = '/Users/me';
  const idx = pathname.indexOf(needle);
  if (idx === -1) return false;
  const after = idx + needle.length;
  return after === pathname.length || pathname[after] === '/';
}

export function getPostId(post: unknown): string {
  if (!post || typeof post !== 'object') return '';
  const p = post as { id?: unknown; Id?: unknown; _id?: unknown };
  const v = p.id ?? p.Id ?? p._id;
  if (typeof v !== 'string') return '';
  const id = v.trim();
  if (!id) return '';
  if (!isObjectId(id)) return '';
  return id;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function mergeHeaders(a?: HeadersInit, b?: HeadersInit): Headers {
  const h = new Headers(a);
  if (b) new Headers(b).forEach((value, key) => h.set(key, value));
  return h;
}

async function parseApiResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (null as unknown) as T;
  }

  const payloadUnknown = (await res.json()) as unknown;

  if (payloadUnknown && typeof payloadUnknown === 'object' && 'success' in payloadUnknown) {
    const wrapped = payloadUnknown as ResponseWrapper<unknown>;
    if (!res.ok || !wrapped.success) throw new Error(wrapped.message || `HTTP ${res.status}`);
    const data = wrapped.data;

    if (data && typeof data === 'object' && 'successful' in data) {
      const inner = data as InnerApiResponse<T>;
      if (!inner.successful) throw new Error(inner.message || 'Request failed');
      return inner.data as T;
    }

    return data as T;
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return payloadUnknown as T;
}

function withRequestContext(method: string, path: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`${method} ${path} -> ${message}`);
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveRequestUrl(path);
  try {
    const headers = mergeHeaders(init?.headers);
    const token = getAccessToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);

    const key = isUsersMeEndpoint(url) ? `${url}|${headers.get('authorization') ?? ''}` : url;
    const cached = inflightGets.get(key);
    if (cached) return (await cached) as T;

    const task = (async () => {
      const res = await fetch(url, {
        ...init,
        method: 'GET',
        headers,
      });
      return await parseApiResponse<T>(res);
    })();

    inflightGets.set(key, task as Promise<unknown>);
    try {
      return await task;
    } finally {
      inflightGets.delete(key);
    }
  } catch (e) {
    throw withRequestContext('GET', url, e);
  }
}

export async function apiPostJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init?: RequestInit
): Promise<TResponse> {
  const url = resolveRequestUrl(path);
  try {
    const headers = mergeHeaders({ 'content-type': 'application/json' }, init?.headers);
    const token = getAccessToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    const res = await fetch(url, {
      ...init,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return await parseApiResponse<TResponse>(res);
  } catch (e) {
    throw withRequestContext('POST', url, e);
  }
}

export async function apiPost<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const url = resolveRequestUrl(path);
  try {
    const headers = mergeHeaders(init?.headers);
    const token = getAccessToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    const res = await fetch(url, {
      ...init,
      method: 'POST',
      headers,
    });
    return await parseApiResponse<TResponse>(res);
  } catch (e) {
    throw withRequestContext('POST', url, e);
  }
}

export async function apiPutJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init?: RequestInit
): Promise<TResponse> {
  const url = resolveRequestUrl(path);
  try {
    const headers = mergeHeaders({ 'content-type': 'application/json' }, init?.headers);
    const token = getAccessToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    const res = await fetch(url, {
      ...init,
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return await parseApiResponse<TResponse>(res);
  } catch (e) {
    throw withRequestContext('PUT', url, e);
  }
}

export async function apiDelete<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const url = resolveRequestUrl(path);
  try {
    const headers = mergeHeaders(init?.headers);
    const token = getAccessToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    const res = await fetch(url, {
      ...init,
      method: 'DELETE',
      headers,
    });
    return await parseApiResponse<TResponse>(res);
  } catch (e) {
    throw withRequestContext('DELETE', url, e);
  }
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  return apiPostJson<TokenResponse, { username: string; password: string }>('/api/auth/login', { username, password });
}

export async function logout(): Promise<void> {
  await apiPost<object>('/api/auth/logout');
}

export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ userId: string }> {
  const res = await apiPostJson<{ userId: string }, typeof input>('/api/Users/register', input);
  return res;
}

export async function getMe(): Promise<UserProfileDto> {
  return apiGet<UserProfileDto>('/api/Users/me', { cache: 'no-store' });
}

export async function updateMe(input: { displayName?: string | null; bio?: string | null; avatarUrl?: string | null }): Promise<void> {
  await apiPutJson<object, typeof input>('/api/Users/me', input);
}

export async function changeMyPassword(input: { oldPassword: string; newPassword: string }): Promise<void> {
  await apiPostJson<object, typeof input>('/api/Users/me/change-password', input);
}
