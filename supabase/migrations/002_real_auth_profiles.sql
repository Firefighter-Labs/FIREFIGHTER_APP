-- 실제 인증 유저 구분: 프로필 공개 읽기 + 표시명 개선

-- 다른 유저의 표시명(anon_label) 읽기 허용 (자산 금액 등은 없음)
create policy "profiles_read_community"
  on public.profiles for select to authenticated using (true);

-- 가입 시 이메일/소셜 이름으로 표시명 설정
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  label text;
begin
  label := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '소방관-' || lpad((floor(random() * 10000))::text, 4, '0')
  );

  insert into public.profiles (id, anon_label)
  values (new.id, label)
  on conflict (id) do update set anon_label = excluded.anon_label;

  return new;
end;
$$;
