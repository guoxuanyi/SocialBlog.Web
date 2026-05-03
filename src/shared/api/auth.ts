import { apiPost, apiPostJson } from '@/shared/api/client';
import type { TokenResponse } from '@/shared/api/types';

export async function login(username: string, password: string): Promise<TokenResponse> {
  return apiPostJson<TokenResponse, { username: string; password: string }>('/api/auth/login', { username, password });
}

export async function logout(): Promise<void> {
  await apiPost<object>('/api/auth/logout');
}
