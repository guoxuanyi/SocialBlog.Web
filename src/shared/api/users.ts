import { apiGet, apiPostJson, apiPutJson } from '@/shared/api/client';
import type { PublicUserDto, UserProfileDto } from '@/shared/api/types';

export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ userId: string }> {
  return apiPostJson<{ userId: string }, typeof input>('/api/Users/register', input);
}

export async function getMe(): Promise<UserProfileDto> {
  return apiGet<UserProfileDto>('/api/Users/me', { cache: 'no-store' });
}

export async function updateMe(input: {
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
}): Promise<UserProfileDto> {
  return apiPutJson<UserProfileDto, typeof input>('/api/Users/me', input);
}

export async function getUserProfile(userId: string): Promise<PublicUserDto> {
  return apiGet<PublicUserDto>(`/api/Users/${encodeURIComponent(userId)}`, { cache: 'no-store' });
}

export async function getUserByUsername(username: string): Promise<PublicUserDto> {
  return apiGet<PublicUserDto>(`/api/Users/by-username/${encodeURIComponent(username)}`, { cache: 'no-store' });
}

export async function changeMyPassword(input: { oldPassword: string; newPassword: string }): Promise<void> {
  await apiPostJson<object, typeof input>('/api/Users/me/change-password', input);
}
