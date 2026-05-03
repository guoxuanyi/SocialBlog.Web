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
