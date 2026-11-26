create table if not exists public.portal_settings (
  id integer primary key default 1 check (id = 1),
  project_duration_days integer not null default 10 check (project_duration_days between 1 and 10),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.portal_settings(id, project_duration_days)
values (1, 10)
on conflict (id) do nothing;

alter table public.portal_settings enable row level security;

drop policy if exists "authenticated users read portal settings" on public.portal_settings;
create policy "authenticated users read portal settings" on public.portal_settings
  for select to authenticated using (true);

drop policy if exists "super admins update portal settings" on public.portal_settings;
create policy "super admins update portal settings" on public.portal_settings
  for update to authenticated
  using (public.current_role() = 'SUPER_ADMIN')
  with check (public.current_role() = 'SUPER_ADMIN');

grant select, update on public.portal_settings to authenticated;
