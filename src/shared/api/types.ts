export type ResponseWrapper<T> = {
  success: boolean;
  message: string;
  data: T;
  code: number;
  timestamp: number;
};

export type InnerApiResponse<T> = {
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
  isDeleted?: boolean;
  deletedAt?: string | null;
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
  refreshToken?: string;
  refreshExpiresIn?: number;
  jti?: string;
};

export type UserProfileDto = {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  followersCount?: number;
  followingCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicUserDto = {
  id: string;
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  followersCount?: number;
  followingCount?: number;
};
