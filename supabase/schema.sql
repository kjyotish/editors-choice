create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

create table if not exists public.inspiration_content (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subtitle text,
  summary text,
  link_url text,
  blocks jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  view_count bigint not null default 0,
  seo_title text,
  seo_description text,
  seo_keywords text[] not null default '{}'::text[],
  content_hash text,
  seo_updated_at timestamptz,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists inspiration_content_published_idx
  on public.inspiration_content (published);

create index if not exists inspiration_content_sort_idx
  on public.inspiration_content (sort_order);

create table if not exists public.ai_prompts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  prompt_type text not null check (prompt_type in ('image_generation', 'color_grade_image', 'image_to_video')),
  subcategory text not null default '',
  prompt_text text not null,
  before_image_url text,
  after_image_url text,
  published boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists ai_prompts_published_idx
  on public.ai_prompts (published);

create index if not exists ai_prompts_sort_idx
  on public.ai_prompts (sort_order);

create index if not exists ai_prompts_subcategory_idx
  on public.ai_prompts (subcategory);

create table if not exists public.ai_prompt_subcategories (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  normalized_label text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists ai_prompt_subcategories_label_idx
  on public.ai_prompt_subcategories (label);

create or replace function public.set_ai_prompt_subcategories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_prompt_subcategories_set_updated_at on public.ai_prompt_subcategories;
create trigger ai_prompt_subcategories_set_updated_at
before update on public.ai_prompt_subcategories
for each row
execute function public.set_ai_prompt_subcategories_updated_at();

alter table public.ai_prompt_subcategories enable row level security;

drop policy if exists "ai_prompt_subcategories_no_direct_select" on public.ai_prompt_subcategories;
create policy "ai_prompt_subcategories_no_direct_select"
  on public.ai_prompt_subcategories
  for select
  to authenticated, anon
  using (false);

drop policy if exists "ai_prompt_subcategories_no_direct_write" on public.ai_prompt_subcategories;
create policy "ai_prompt_subcategories_no_direct_write"
  on public.ai_prompt_subcategories
  for all
  to authenticated, anon
  using (false)
  with check (false);

create or replace function public.set_ai_prompts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_prompts_set_updated_at on public.ai_prompts;
create trigger ai_prompts_set_updated_at
before update on public.ai_prompts
for each row
execute function public.set_ai_prompts_updated_at();

alter table public.ai_prompts enable row level security;

drop policy if exists "ai_prompts_no_direct_select" on public.ai_prompts;
create policy "ai_prompts_no_direct_select"
  on public.ai_prompts
  for select
  to authenticated, anon
  using (false);

drop policy if exists "ai_prompts_no_direct_write" on public.ai_prompts;
create policy "ai_prompts_no_direct_write"
  on public.ai_prompts
  for all
  to authenticated, anon
  using (false)
  with check (false);

create table if not exists public.songs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  artist_name text,
  category text not null,
  rating integer not null default 5 check (rating between 1 and 10),
  youtube_url text not null,
  youtube_embed_url text not null,
  thumbnail_url text,
  search_terms text not null default '',
  search_text text not null default '',
  published boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
declare
  category_constraint_name text;
begin
  select conname
  into category_constraint_name
  from pg_constraint
  where conrelid = 'public.songs'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%category in%';

  if category_constraint_name is not null then
    execute format('alter table public.songs drop constraint %I', category_constraint_name);
  end if;
end $$;

alter table public.songs
  add column if not exists rating integer;

alter table public.songs
  add column if not exists search_terms text;

update public.songs
set rating = 5
where rating is null;

update public.songs
set search_terms = ''
where search_terms is null;

alter table public.songs
  alter column search_terms set default '';

alter table public.songs
  alter column search_terms set not null;

alter table public.songs
  alter column rating set default 5;

alter table public.songs
  alter column rating set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'songs_rating_check'
      and conrelid = 'public.songs'::regclass
  ) then
    alter table public.songs
      add constraint songs_rating_check check (rating between 1 and 10);
  end if;
end $$;

create or replace function public.ensure_song_category_constraints()
returns void
language plpgsql
as $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.songs'::regclass
      and contype = 'c'
      and conname = 'songs_category_check'
  ) then
    alter table public.songs drop constraint songs_category_check;
  end if;
end;
$$;

create table if not exists public.song_categories (
  key text primary key,
  label text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists song_categories_label_idx
  on public.song_categories (label);

create or replace function public.ensure_song_categories_table()
returns void
language plpgsql
as $$
begin
  create table if not exists public.song_categories (
    key text primary key,
    label text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz
  );

  create index if not exists song_categories_label_idx
    on public.song_categories (label);

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'song_categories_set_updated_at'
      and tgrelid = 'public.song_categories'::regclass
  ) then
    create or replace function public.set_song_categories_updated_at()
    returns trigger
    language plpgsql
    as $func$
    begin
      new.updated_at = now();
      return new;
    end;
    $func$;

    create trigger song_categories_set_updated_at
    before update on public.song_categories
    for each row
    execute function public.set_song_categories_updated_at();
  end if;
end;
$$;

create or replace function public.set_song_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists song_categories_set_updated_at on public.song_categories;
create trigger song_categories_set_updated_at
before update on public.song_categories
for each row
execute function public.set_song_categories_updated_at();

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

alter table public.song_categories enable row level security;

drop policy if exists "song_categories_no_direct_select" on public.song_categories;
create policy "song_categories_no_direct_select"
  on public.song_categories
  for select
  to authenticated, anon
  using (false);

drop policy if exists "song_categories_no_direct_write" on public.song_categories;
create policy "song_categories_no_direct_write"
  on public.song_categories
  for all
  to authenticated, anon
  using (false)
  with check (false);
