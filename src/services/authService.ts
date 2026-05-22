import type { User } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import type { DbProfile } from '../lib/database.types';

export async function getSession() {
  const supabase = getSupabase();
  if (!supabase) return { session: null, user: null };
  const { data } = await supabase.auth.getSession();
  return { session: data.session, user: data.session?.user ?? null };
}

/** 로컬 세션 기준 (getUser 네트워크 호출 없이 빠르게) */
export async function requireUserId(): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('로그인이 필요합니다.');
  }
  return session.user.id;
}

export function getDisplayName(
  user: { email?: string; user_metadata?: Record<string, unknown> } | null,
  profile: DbProfile | null
): string {
  if (profile?.anon_label) return profile.anon_label;
  const meta = user?.user_metadata;
  const name = (meta?.full_name ?? meta?.name) as string | undefined;
  if (name?.trim()) return name.trim();
  if (user?.email) return user.email.split('@')[0];
  return '소방관';
}

/** 프로필 없으면 생성 (406 .single() 오류 방지) */
export async function ensureMyProfile(user: User): Promise<DbProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: existing, error: readErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (readErr) {
    console.warn('profiles read:', readErr.message);
  }
  if (existing) return existing as DbProfile;

  const label = getDisplayName(user, null);
  const { data: created, error: insertErr } = await supabase
    .from('profiles')
    .insert({ id: user.id, anon_label: label })
    .select()
    .maybeSingle();

  if (insertErr) {
    console.warn('profiles insert:', insertErr.message);
    return null;
  }
  return (created as DbProfile) ?? null;
}

export async function fetchMyProfile(): Promise<DbProfile | null> {
  const { user } = await getSession();
  if (!user) return null;
  return ensureMyProfile(user);
}

export async function sendEmailOtp(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

  const redirectTo = `${window.location.origin}${window.location.pathname}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });

  if (error) throw error;

  // 일부 환경(Safari 등)에서 자동 이동이 안 될 때 수동 리다이렉트
  if (data?.url) {
    window.location.assign(data.url);
  }
}

export async function updateDisplayName(name: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

  const userId = await requireUserId();
  const label = name.trim().slice(0, 20);
  if (!label) throw new Error('표시명을 입력해 주세요.');

  const { error } = await supabase.from('profiles').update({ anon_label: label }).eq('id', userId);
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}
