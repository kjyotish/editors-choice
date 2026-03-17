create extension if not exists "uuid-ossp";

create table if not exists public.inspiration_content (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subtitle text,
  summary text,
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
