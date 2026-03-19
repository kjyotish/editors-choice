create table if not exists public.noticeboard_content (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('image', 'svg', 'gif', 'video')),
  media_url text not null,
  alt_text text,
  link_url text,
  is_active boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists noticeboard_content_active_sort_idx
  on public.noticeboard_content (is_active, sort_order, created_at desc);

create or replace function public.set_noticeboard_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists noticeboard_content_set_updated_at on public.noticeboard_content;
create trigger noticeboard_content_set_updated_at
before update on public.noticeboard_content
for each row
execute function public.set_noticeboard_updated_at();

alter table public.noticeboard_content enable row level security;

drop policy if exists "noticeboard_content_no_direct_select" on public.noticeboard_content;
create policy "noticeboard_content_no_direct_select"
  on public.noticeboard_content
  for select
  to authenticated, anon
  using (false);

drop policy if exists "noticeboard_content_no_direct_write" on public.noticeboard_content;
create policy "noticeboard_content_no_direct_write"
  on public.noticeboard_content
  for all
  to authenticated, anon
  using (false)
  with check (false);
