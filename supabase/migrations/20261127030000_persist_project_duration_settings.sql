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

create or replace function public.allocate_project(p_project_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_project public.projects%rowtype;
  v_allocation_id uuid;
  v_deadline timestamptz;
  v_duration_days integer;
  v_template record;
  v_requirement_version_id uuid;
begin
  if v_student_id is null then raise exception 'Authentication required'; end if;
  select * into v_profile from public.profiles where id = v_student_id;
  if v_profile.account_status != 'ACTIVE' then raise exception 'Student account is inactive'; end if;
  if v_profile.role != 'STUDENT' then raise exception 'Only students can allocate projects'; end if;
  if exists (select 1 from public.project_allocations
             where student_id = v_student_id
             and status not in ('CANCELLED','APPROVED')) then
    raise exception 'You already have an active project';
  end if;

  select * into v_project from public.projects where id = p_project_id for update;
  if not found or v_project.status != 'PUBLISHED' then
    raise exception 'Project is not available';
  end if;
  if exists (select 1 from public.project_allocations
             where project_id = p_project_id
             and status not in ('CANCELLED','APPROVED')) then
    raise exception 'Sorry, this project has just been allocated to another student';
  end if;

  select project_duration_days into v_duration_days
  from public.portal_settings
  where id = 1;
  if not found then
    raise exception 'Project duration settings are unavailable; contact your administrator';
  end if;

  v_deadline := now() + make_interval(days => v_duration_days);
  select id into v_requirement_version_id
    from public.project_requirement_versions
    where project_id = p_project_id
    order by version_number desc limit 1;

  insert into public.project_allocations(project_id, student_id, allocation_date, deadline, status, allocated_by, requirement_version_id)
  values(p_project_id, v_student_id, now(), v_deadline, 'ACTIVE', v_student_id, v_requirement_version_id)
  returning id into v_allocation_id;

  for v_template in
    select * from public.project_checklist_templates where project_id = p_project_id order by day_number, sort_order
  loop
    insert into public.student_checklist_items(allocation_id, template_id, task_title_snapshot, day_number)
    values(
      v_allocation_id,
      v_template.id,
      v_template.task_title,
      ceil(v_template.day_number * v_duration_days::numeric / 10)::integer
    );
  end loop;

  insert into public.notifications(recipient_id, title, message, notification_type)
  values(
    v_student_id,
    'Project allocated',
    'Your project has been successfully allocated. You have ' || v_duration_days || ' days to complete it.',
    'PROJECT_ALLOCATED'
  );
  insert into public.notifications(recipient_id, title, message, notification_type)
  select sf.faculty_id, 'New project allocation',
    v_profile.full_name || ' selected ' || v_project.title || '.', 'PROJECT_ALLOCATED'
  from public.subject_faculty sf where sf.subject_id = v_project.subject_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values(
    v_student_id,
    'PROJECT_ALLOCATED',
    'project',
    p_project_id,
    jsonb_build_object('allocation_id', v_allocation_id, 'duration_days', v_duration_days)
  );
  return v_allocation_id;
end;
$$;

revoke all on function public.allocate_project(uuid) from public;
grant execute on function public.allocate_project(uuid) to authenticated;
