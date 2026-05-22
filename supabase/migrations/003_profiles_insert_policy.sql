-- 로그인 유저가 프로필이 없을 때 직접 생성 가능 (406 방지)
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);
