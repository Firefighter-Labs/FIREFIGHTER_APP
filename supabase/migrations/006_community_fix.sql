-- 비밀방: 삭제 정책 · 댓글 테이블 · 프로필 읽기 (한 번에 적용)

-- 게시글 삭제 (본인 글만)
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);

-- 익명 표시명: 피드·단톡에서 다른 회원 라벨 읽기
drop policy if exists "profiles_read_community" on public.profiles;
create policy "profiles_read_community"
  on public.profiles for select to authenticated
  using (true);

-- 005 미적용 환경용: posts 확장 컬럼
alter table public.posts
  add column if not exists post_type text not null default 'cert'
    check (post_type in ('cert', 'question', 'win', 'tip'));

alter table public.posts
  add column if not exists attach_fire_stats boolean not null default false;

alter table public.posts
  add column if not exists coverage_pct numeric(5, 2);

alter table public.posts
  add column if not exists monthly_dividend_krw numeric(14, 0);

alter table public.posts
  add column if not exists holdings_count int;

-- 댓글 테이블
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at asc);

alter table public.post_comments enable row level security;

drop policy if exists "post_comments_read" on public.post_comments;
create policy "post_comments_read" on public.post_comments
  for select to authenticated using (true);

drop policy if exists "post_comments_insert" on public.post_comments;
create policy "post_comments_insert" on public.post_comments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "post_comments_delete_own" on public.post_comments;
create policy "post_comments_delete_own" on public.post_comments
  for delete to authenticated using (auth.uid() = user_id);
