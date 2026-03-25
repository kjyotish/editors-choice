create extension if not exists "uuid-ossp";

create table if not exists public.daily_blogs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  cover_image_url text,
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

