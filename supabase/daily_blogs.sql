create extension if not exists "uuid-ossp";

create table if not exists public.daily_blogs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  cover_image_url text,
  link_url text,
  tags text[] not null default '{}'::text[],
  published boolean not null default false,
  sort_order integer,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists daily_blogs_published_idx
  on public.daily_blogs (published, published_at desc);

create index if not exists daily_blogs_slug_idx
  on public.daily_blogs (slug);

-- The app reads and writes blogs through server-side routes using the service
-- role. Deny direct access from the public and authenticated browser roles.
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
