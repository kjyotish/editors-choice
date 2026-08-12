-- Apply this migration in the Supabase SQL Editor to fix existing deployments.
-- Browser roles must use the application's authenticated API routes; the
-- server-side service-role client bypasses RLS as intended.

alter table public.inspiration_content enable row level security;

drop policy if exists "inspiration_content_no_direct_select" on public.inspiration_content;
create policy "inspiration_content_no_direct_select"
  on public.inspiration_content
  for select
  to authenticated, anon
  using (false);

drop policy if exists "inspiration_content_no_direct_write" on public.inspiration_content;
create policy "inspiration_content_no_direct_write"
  on public.inspiration_content
  for all
  to authenticated, anon
  using (false)
  with check (false);

alter table public.daily_blogs enable row level security;

drop policy if exists "daily_blogs_no_direct_select" on public.daily_blogs;
create policy "daily_blogs_no_direct_select"
  on public.daily_blogs
  for select
  to authenticated, anon
  using (false);

drop policy if exists "daily_blogs_no_direct_write" on public.daily_blogs;
create policy "daily_blogs_no_direct_write"
  on public.daily_blogs
  for all
  to authenticated, anon
  using (false)
  with check (false);

-- Lock every existing application function to its intended schemas. This
-- prevents a caller-controlled schema from shadowing referenced objects.
do $$
declare function_name text;
begin
  foreach function_name in array array[
    'set_site_settings_updated_at', 'set_ai_prompt_subcategories_updated_at',
    'set_ai_prompts_updated_at', 'ensure_song_category_constraints',
    'ensure_song_categories_table', 'set_song_categories_updated_at',
    'set_songs_updated_at', 'set_noticeboard_updated_at'
  ] loop
    if to_regprocedure(format('public.%s()', function_name)) is not null then
      execute format('alter function public.%I() set search_path = public, pg_temp', function_name);
    end if;
  end loop;
end $$;
