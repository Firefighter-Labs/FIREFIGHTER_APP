import type { PostgrestError } from '@supabase/supabase-js';

export function toUserMessage(error: unknown, fallback = '요청에 실패했습니다.'): string {
  if (error instanceof Error && error.message) return error.message;

  const pg = error as PostgrestError;
  if (pg?.message) {
    if (pg.code === '23503' || pg.message.includes('foreign key')) {
      return '계정이 유효하지 않습니다. 로그아웃 후 다시 로그인해 주세요.';
    }
    if (pg.code === '23505') {
      return '이미 처리된 요청입니다.';
    }
    if (pg.code === '42501' || pg.message.includes('row-level security')) {
      return '권한이 없습니다. Supabase에 삭제·댓글 정책(006_community_fix.sql)을 적용했는지 확인해 주세요.';
    }
    return pg.message;
  }

  return fallback;
}
