import { apiGet, apiPost } from '@/shared/api/client';
import type { PaginatedResponse, PostDto } from '@/shared/api/types';

export async function getMyTrashPosts(skip = 0, limit = 20): Promise<PaginatedResponse<PostDto>> {
  return apiGet<PaginatedResponse<PostDto>>(`/api/Posts/trash?skip=${skip}&limit=${limit}`, { cache: 'no-store' });
}

export async function restorePost(postId: string): Promise<{ restored: boolean }> {
  return apiPost<{ restored: boolean }>(`/api/Posts/${encodeURIComponent(postId)}/restore`);
}
