create table if not exists public.songs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  artist_name text,
  category text not null check (category in ('travel', 'golden_hour', 'bridal', 'food')),
  rating integer not null default 5 check (rating between 1 and 10),
  youtube_url text not null,
  youtube_embed_url text not null,
  thumbnail_url text,
  search_text text not null default '',
  published boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists songs_published_idx
  on public.songs (published);

create index if not exists songs_category_idx
  on public.songs (category);

create index if not exists songs_sort_idx
  on public.songs (sort_order);

create index if not exists songs_search_text_trgm_idx
  on public.songs using gin (search_text gin_trgm_ops);

create or replace function public.set_songs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
before update on public.songs
for each row
execute function public.set_songs_updated_at();

alter table public.songs enable row level security;

drop policy if exists "songs_no_direct_select" on public.songs;
create policy "songs_no_direct_select"
  on public.songs
  for select
  to authenticated, anon
  using (false);

drop policy if exists "songs_no_direct_write" on public.songs;
create policy "songs_no_direct_write"
  on public.songs
  for all
  to authenticated, anon
  using (false)
  with check (false);
