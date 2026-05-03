import { apiDelete, apiGet, apiPost } from '@/shared/api/client';
import type { PaginatedResponse, PublicUserDto } from '@/shared/api/types';

export async function followUser(userId: string): Promise<void> {
  await apiPost<object>(`/api/Follows/${encodeURIComponent(userId)}`);
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiDelete<object>(`/api/Follows/${encodeURIComponent(userId)}`);
}

export async function getFollowStatus(userId: string): Promise<{ following: boolean }> {
  return apiGet<{ following: boolean }>(`/api/Follows/status?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
}

export async function getFollowers(userId: string, skip = 0, limit = 20): Promise<PaginatedResponse<PublicUserDto>> {
  return apiGet<PaginatedResponse<PublicUserDto>>(`/api/Follows/${encodeURIComponent(userId)}/followers?skip=${skip}&limit=${limit}`, { cache: 'no-store' });
}

export async function getFollowing(userId: string, skip = 0, limit = 20): Promise<PaginatedResponse<PublicUserDto>> {
  return apiGet<PaginatedResponse<PublicUserDto>>(`/api/Follows/${encodeURIComponent(userId)}/following?skip=${skip}&limit=${limit}`, { cache: 'no-store' });
}
