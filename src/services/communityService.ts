import { getSupabase } from '../lib/supabase';
import type { DbChatMessage, DbPost, DbPostComment, DbPostLike, DbProfile } from '../lib/database.types';
import type { BadgeTier, ChatMessage, CommunityPost, PostComment, PostFireStats, PostType } from '../types';
import { toUserMessage } from '../utils/supabaseError';
import { requireUserId } from './authService';

function throwIfError(error: { message: string; code?: string } | null, action: string): void {
  if (!error) return;
  throw new Error(toUserMessage(error, `${action}에 실패했습니다.`));
}

/** post_comments 테이블·RLS 미적용 시 */
function isMissingCommentsTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message ?? '';
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('post_comments') ||
    msg.includes('schema cache')
  );
}

function isMissingPostsColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message ?? '';
  return error.code === 'PGRST204' || msg.includes('post_type') || msg.includes('attach_fire_stats');
}

let postCommentsAvailable: boolean | null = null;

function commentsEnabled(): boolean {
  return postCommentsAvailable !== false;
}

async function fetchProfileLabels(userIds: string[]): Promise<Map<string, string>> {
  const supabase = getSupabase();
  const map = new Map<string, string>();
  if (!supabase || userIds.length === 0) return map;

  const { data } = await supabase.from('profiles').select('id, anon_label').in('id', userIds);
  for (const p of (data ?? []) as Pick<DbProfile, 'id' | 'anon_label'>[]) {
    map.set(p.id, p.anon_label);
  }
  return map;
}

async function fetchCommentCounts(postIds: string[]): Promise<Map<string, number>> {
  const supabase = getSupabase();
  const map = new Map<string, number>();
  if (!supabase || postIds.length === 0 || !commentsEnabled()) return map;

  const { data, error } = await supabase.from('post_comments').select('post_id').in('post_id', postIds);
  if (error) {
    if (isMissingCommentsTable(error)) postCommentsAvailable = false;
    return map;
  }
  postCommentsAvailable = true;

  for (const row of (data ?? []) as Pick<DbPostComment, 'post_id'>[]) {
    map.set(row.post_id, (map.get(row.post_id) ?? 0) + 1);
  }
  return map;
}

function mapPost(
  row: DbPost,
  likedIds: Set<string>,
  labels: Map<string, string>,
  currentUserId: string | null,
  commentCounts: Map<string, number>
): CommunityPost {
  const postType = (row.post_type ?? 'cert') as PostType;
  let fireStats: PostFireStats | undefined;
  if (row.attach_fire_stats && row.coverage_pct != null) {
    fireStats = {
      coveragePct: Number(row.coverage_pct),
      monthlyNetKRW: Number(row.monthly_dividend_krw ?? 0),
      holdingsCount: row.holdings_count ?? 0,
      tier: row.badge_tier as BadgeTier,
    };
  }

  return {
    id: row.id,
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
    postType,
    attachPortfolio: row.attach_portfolio,
    attachFireStats: row.attach_fire_stats ?? false,
    fireStats,
    likes: row.likes_count,
    commentCount: commentCounts.get(row.id) ?? 0,
    badgeTier: row.badge_tier as BadgeTier,
    stockRatio: row.stock_ratio ?? undefined,
    cashRatio: row.cash_ratio ?? undefined,
    likedByMe: likedIds.has(row.id),
    authorLabel: labels.get(row.user_id) ?? '소방관',
    isMine: currentUserId === row.user_id,
  };
}

export async function fetchPosts(userId: string | null): Promise<CommunityPost[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  const rows = (posts ?? []) as DbPost[];
  const postIds = rows.map((p) => p.id);
  const userIds = [...new Set(rows.map((p) => p.user_id))];

  const [labels, likesResult, commentCounts] = await Promise.all([
    fetchProfileLabels(userIds),
    userId
      ? supabase.from('post_likes').select('post_id').eq('user_id', userId)
      : Promise.resolve({ data: [] as DbPostLike[] }),
    fetchCommentCounts(postIds),
  ]);

  const likedIds = new Set(((likesResult.data ?? []) as DbPostLike[]).map((l) => l.post_id));
  return rows.map((p) => mapPost(p, likedIds, labels, userId, commentCounts));
}

export async function fetchPostComments(postId: string, currentUserId: string | null): Promise<PostComment[]> {
  const supabase = getSupabase();
  if (!supabase || !commentsEnabled()) return [];

  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    if (isMissingCommentsTable(error)) {
      postCommentsAvailable = false;
      return [];
    }
    throw error;
  }
  postCommentsAvailable = true;

  const rows = (data ?? []) as DbPostComment[];
  const userIds = [...new Set(rows.map((c) => c.user_id))];
  const labels = await fetchProfileLabels(userIds);

  return rows.map((c) => ({
    id: c.id,
    postId: c.post_id,
    content: c.content,
    createdAt: new Date(c.created_at).getTime(),
    authorLabel: labels.get(c.user_id) ?? '소방관',
    isMine: currentUserId === c.user_id,
  }));
}

export async function fetchChatMessages(currentUserId: string | null): Promise<ChatMessage[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(80);

  if (error) throw error;

  const rows = (data ?? []) as DbChatMessage[];
  const userIds = [...new Set(rows.map((m) => m.user_id))];
  const labels = await fetchProfileLabels(userIds);

  return rows.map((m) => ({
    id: m.id,
    text: m.text,
    at: new Date(m.created_at).getTime(),
    authorLabel: labels.get(m.user_id) ?? '소방관',
    isMine: currentUserId === m.user_id,
  }));
}

export async function createPost(input: {
  content: string;
  postType: PostType;
  attachPortfolio: boolean;
  attachFireStats: boolean;
  badgeTier: BadgeTier;
  stockRatio: number;
  cashRatio: number;
  fireStats?: PostFireStats;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const userId = await requireUserId();

  const fullRow = {
    user_id: userId,
    content: input.content,
    post_type: input.postType,
    attach_portfolio: input.attachPortfolio,
    attach_fire_stats: input.attachFireStats,
    coverage_pct: input.attachFireStats ? input.fireStats?.coveragePct : null,
    monthly_dividend_krw: input.attachFireStats ? input.fireStats?.monthlyNetKRW : null,
    holdings_count: input.attachFireStats ? input.fireStats?.holdingsCount : null,
    badge_tier: input.badgeTier,
    stock_ratio: input.attachPortfolio ? input.stockRatio : null,
    cash_ratio: input.attachPortfolio ? input.cashRatio : null,
  };

  let { error } = await supabase.from('posts').insert(fullRow);

  if (error && isMissingPostsColumn(error)) {
    ({ error } = await supabase.from('posts').insert({
      user_id: userId,
      content: input.content,
      attach_portfolio: input.attachPortfolio,
      badge_tier: input.badgeTier,
      stock_ratio: input.attachPortfolio ? input.stockRatio : null,
      cash_ratio: input.attachPortfolio ? input.cashRatio : null,
    }));
  }

  throwIfError(error, '게시');
}

export async function createComment(postId: string, content: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  if (!commentsEnabled()) {
    throw new Error(
      '댓글 기능을 쓰려면 Supabase SQL Editor에서 supabase/migrations/006_community_fix.sql 을 실행해 주세요.'
    );
  }

  const userId = await requireUserId();
  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    user_id: userId,
    content,
  });
  if (error && isMissingCommentsTable(error)) {
    postCommentsAvailable = false;
    throw new Error(
      '댓글 테이블이 없습니다. Supabase에서 006_community_fix.sql 마이그레이션을 적용해 주세요.'
    );
  }
  throwIfError(error, '댓글');
}

export async function likePostRemote(postId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const userId = await requireUserId();

  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  if (error?.code === '23505') return;
  throwIfError(error, '응원');
}

export async function deletePost(postId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId)
    .select('id');

  throwIfError(error, '삭제');

  if (!data?.length) {
    throw new Error(
      '글을 삭제하지 못했습니다. 본인 글인지 확인하고, Supabase SQL Editor에서 006_community_fix.sql(삭제 정책)을 실행했는지 확인해 주세요.'
    );
  }
}

export async function sendChatMessage(text: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const userId = await requireUserId();

  const { error } = await supabase.from('chat_messages').insert({ user_id: userId, text });
  throwIfError(error, '메시지 전송');
}

export function subscribeCommunity(onChange: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('firefighter-community')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, onChange);

  if (commentsEnabled()) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, onChange);
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
