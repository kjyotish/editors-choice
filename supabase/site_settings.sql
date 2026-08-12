create table if not exists public.site_settings (
  id text primary key default 'global' check (id = 'global'),
  banner_visible boolean not null default true,
  commercial_actions_require_login boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.site_settings
  add column if not exists commercial_actions_require_login boolean not null default true;

insert into public.site_settings (id, banner_visible)
values ('global', true)
on conflict (id) do nothing;

create or replace function public.set_site_settings_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row
execute function public.set_site_settings_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_no_direct_select" on public.site_settings;
create policy "site_settings_no_direct_select"
  on public.site_settings
  for select
  to authenticated, anon
  using (false);

drop policy if exists "site_settings_no_direct_write" on public.site_settings;
create policy "site_settings_no_direct_write"
  on public.site_settings
  for all
  to authenticated, anon
  using (false)
  with check (false);
