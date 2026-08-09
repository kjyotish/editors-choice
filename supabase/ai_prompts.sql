create table if not exists public.ai_prompts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  prompt_type text not null check (prompt_type in ('image_generation', 'color_grade_image', 'image_to_video')),
  subcategory text not null default '',
  prompt_text text not null,
  before_image_url text,
  after_image_url text,
  video_url text,
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
