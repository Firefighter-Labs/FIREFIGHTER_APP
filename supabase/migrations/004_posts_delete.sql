create policy "posts_delete_own"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);
