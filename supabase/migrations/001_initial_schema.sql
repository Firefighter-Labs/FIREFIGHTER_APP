-- FIREFIGHTER Supabase 초기 스키마
-- Supabase Dashboard → SQL Editor 에서 실행하거나: supabase db push

-- ─── 종목·배당 메타 (배당 캘린더용, 공개 읽기) ───
create table public.stocks (
  symbol text primary key,
  name text not null,
  market text not null check (market in ('KR', 'US')),
  currency text not null check (currency in ('KRW', 'USD')),
  created_at timestamptz not null default now()
);

create table public.dividend_events (
  id uuid primary key default gen_random_uuid(),
  symbol text not null references public.stocks(symbol) on delete cascade,
  ex_date date not null,
  pay_date date not null,
  amount_per_share numeric(12, 4) not null,
  year int not null,
  unique (symbol, pay_date)
);

create index dividend_events_pay_idx on public.dividend_events (pay_date);
create index dividend_events_symbol_year_idx on public.dividend_events (symbol, year);

-- ─── 익명 프로필 (정확한 자산 금액은 저장하지 않음) ───
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  anon_label text not null,
  created_at timestamptz not null default now()
);

-- ─── 커뮤니티 피드 ───
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) <= 2000),
  attach_portfolio boolean not null default false,
  badge_tier text not null,
  stock_ratio int check (stock_ratio >= 0 and stock_ratio <= 100),
  cash_ratio int check (cash_ratio >= 0 and cash_ratio <= 100),
  likes_count int not null default 0,
  created_at timestamptz not null default now()
);

create index posts_created_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ─── 실시간 단톡 ───
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) <= 500),
  created_at timestamptz not null default now()
);

create index chat_messages_created_idx on public.chat_messages (created_at desc);

-- 좋아요 카운트 자동 증가
create or replace function public.handle_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  return new;
end;
$$;

create trigger on_post_like
  after insert on public.post_likes
  for each row execute function public.handle_post_like();

-- 신규 유저 → 익명 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, anon_label)
  values (
    new.id,
    '익명소방관-' || lpad((floor(random() * 10000))::text, 4, '0')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── RLS ───
alter table public.stocks enable row level security;
alter table public.dividend_events enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.chat_messages enable row level security;

-- 종목·배당: 누구나 읽기
create policy "stocks_read" on public.stocks for select using (true);
create policy "dividend_events_read" on public.dividend_events for select using (true);

-- 프로필: 본인만 읽기/수정
create policy "profiles_read_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- 게시글: 로그인 유저 읽기·작성
create policy "posts_read" on public.posts for select to authenticated using (true);
create policy "posts_insert" on public.posts for insert to authenticated with check (auth.uid() = user_id);

-- 좋아요: 본인만 추가, 중복 방지는 PK
create policy "post_likes_read" on public.post_likes for select to authenticated using (true);
create policy "post_likes_insert" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);

-- 채팅: 로그인 유저 읽기·작성
create policy "chat_read" on public.chat_messages for select to authenticated using (true);
create policy "chat_insert" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);

-- Realtime publication (Supabase Dashboard에서도 활성화 가능)
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.chat_messages;
