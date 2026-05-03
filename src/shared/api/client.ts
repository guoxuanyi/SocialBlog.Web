import type { InnerApiResponse, ResponseWrapper } from '@/shared/api/types';

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
  const err = new Error(message);
  (err as unknown as { cause?: unknown }).cause = { method, path, error };
  return err;
}

function isRetryableGetFailure(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  if (!msg) return false;
  if (/^HTTP\s+\d{3}\b/i.test(msg)) return false;
  if (/\b(unauthorized|forbidden|not found|bad request)\b/i.test(msg)) return false;
  return /\b(failed to fetch|networkerror|load failed|fetch failed|timeout|timed out)\b/i.test(msg);
}

export function toUserErrorMessage(error: unknown, fallback = '请求失败，请稍后重试'): string {
  const raw = error instanceof Error ? error.message : String(error);
  const withoutPrefix = raw.replace(/^(GET|POST|PUT|DELETE)\s+\S+\s+->\s+/i, '').trim();
  if (!withoutPrefix) return fallback;

  if (
    /unable to resolve service for type/i.test(withoutPrefix) ||
    /while attempting to activate/i.test(withoutPrefix) ||
    /socialblog\./i.test(withoutPrefix) ||
    /microsoft\./i.test(withoutPrefix) ||
    /\bsystem\./i.test(withoutPrefix) ||
    /\bexception\b/i.test(withoutPrefix) ||
    /\bstack trace\b/i.test(withoutPrefix)
  ) {
    return fallback;
  }

  if (/invalid username or password/i.test(withoutPrefix) || /用户名.*密码.*(错|不对)/.test(withoutPrefix)) return '用户名或密码错误';
  if (/^user not found$/i.test(withoutPrefix)) return '用户不存在';
  if (/^post not found$/i.test(withoutPrefix)) return '文章不存在';
  if (/^comment not found$/i.test(withoutPrefix)) return '评论不存在';

  if (/an internal server error occurred/i.test(withoutPrefix)) return '服务开小差了，请稍后重试';
  if (/^bad request$/i.test(withoutPrefix)) return '请求失败，请检查输入';

  const http = withoutPrefix.match(/^HTTP\s+(\d{3})\b/i);
  if (http) {
    const code = Number(http[1]);
    if (code === 401) return '登录已过期，请重新登录';
    if (code === 403) return '没有权限执行此操作';
    if (code === 404) return '资源不存在';
    if (code >= 500) return '服务开小差了，请稍后重试';
    return fallback;
  }

  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(withoutPrefix)) {
    return '网络异常，请检查网络后重试';
  }

  if (/(https?:\/\/|\/api\/)/i.test(withoutPrefix)) return fallback;
  if (withoutPrefix.length > 180) return fallback;
  return withoutPrefix;
}

function maybeToastApiError(method: string, error: unknown) {
  if (typeof window === 'undefined') return;
  if (method.toUpperCase() === 'GET') return;
  const msg = toUserErrorMessage(error, '').trim();
  if (!msg) return;
  try {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: msg } }));
  } catch {}
}

function handleUnauthorizedIfNeeded(res: Response, url: string, headers: Headers) {
  if (res.status !== 401) return;
  const authHeader = headers.get('authorization') ?? '';
  const hadToken = authHeader.trim().toLowerCase().startsWith('bearer ');
  if (!hadToken) return;
  if (typeof window === 'undefined') return;
  try {
    clearAccessToken();
    inflightGets.clear();
  } catch {}
  try {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.dispatchEvent(new CustomEvent('auth:required', { detail: { reason: 'expired', next } }));
    window.dispatchEvent(new CustomEvent('auth:refresh'));
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: '登录已过期，请重新登录' } }));
  } catch {}
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveRequestUrl(path);
  try {
    const headers = mergeHeaders(init?.headers);
    const token = getAccessToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);

    const key = `${url}|${headers.get('authorization') ?? ''}`;
    const cached = inflightGets.get(key);
    if (cached) {
      try {
        return (await cached) as T;
      } catch (e) {
        if (!isRetryableGetFailure(e)) throw e;
        if (inflightGets.get(key) === cached) inflightGets.delete(key);
      }
    }
    const afterRetry = inflightGets.get(key);
    if (afterRetry) return (await afterRetry) as T;

    const task = (async () => {
      const res = await fetch(url, {
        ...init,
        method: 'GET',
        headers,
      });
      handleUnauthorizedIfNeeded(res, url, headers);
      return await parseApiResponse<T>(res);
    })();

    inflightGets.set(key, task as Promise<unknown>);
    try {
      return await task;
    } finally {
      inflightGets.delete(key);
    }
  } catch (e) {
    const err = withRequestContext('GET', url, e);
    maybeToastApiError('GET', err);
    throw err;
  }
}

export async function apiPostJson<TResponse, TBody>(path: string, body: TBody, init?: RequestInit): Promise<TResponse> {
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
    handleUnauthorizedIfNeeded(res, url, headers);
    return await parseApiResponse<TResponse>(res);
  } catch (e) {
    const err = withRequestContext('POST', url, e);
    maybeToastApiError('POST', err);
    throw err;
  }
}

export async function apiPostForm<TResponse>(path: string, body: FormData, init?: RequestInit): Promise<TResponse> {
  const url = resolveRequestUrl(path);
  try {
    const headers = mergeHeaders(init?.headers);
    const token = getAccessToken();
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    const res = await fetch(url, {
      ...init,
      method: 'POST',
      headers,
      body,
    });
    handleUnauthorizedIfNeeded(res, url, headers);
    return await parseApiResponse<TResponse>(res);
  } catch (e) {
    const err = withRequestContext('POST', url, e);
    maybeToastApiError('POST', err);
    throw err;
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
    handleUnauthorizedIfNeeded(res, url, headers);
    return await parseApiResponse<TResponse>(res);
  } catch (e) {
    const err = withRequestContext('POST', url, e);
    maybeToastApiError('POST', err);
    throw err;
  }
}

export async function apiPutJson<TResponse, TBody>(path: string, body: TBody, init?: RequestInit): Promise<TResponse> {
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
    handleUnauthorizedIfNeeded(res, url, headers);
    return await parseApiResponse<TResponse>(res);
  } catch (e) {
    const err = withRequestContext('PUT', url, e);
    maybeToastApiError('PUT', err);
    throw err;
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
    handleUnauthorizedIfNeeded(res, url, headers);
    return await parseApiResponse<TResponse>(res);
  } catch (e) {
    const err = withRequestContext('DELETE', url, e);
    maybeToastApiError('DELETE', err);
    throw err;
  }
}
