create or replace function public.cancel_project_allocation(p_allocation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_allocation public.project_allocations%rowtype;
  v_project public.projects%rowtype;
  v_project_id uuid;
begin
  if v_student_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_student_id;

  if v_profile.role is distinct from 'STUDENT' or v_profile.account_status is distinct from 'ACTIVE' then
    raise exception 'Only active students can change a project allocation';
  end if;

  select project_id into v_project_id
  from public.project_allocations
  where id = p_allocation_id
    and student_id = v_student_id;

  if v_project_id is null then
    raise exception 'Project allocation not found';
  end if;

  select * into v_project
  from public.projects
  where id = v_project_id
  for update;

  if not found then
    raise exception 'The allocated project no longer exists';
  end if;

  select * into v_allocation
  from public.project_allocations
  where id = p_allocation_id
    and student_id = v_student_id
  for update;

  if not found then
    raise exception 'Project allocation not found';
  end if;

  if v_allocation.status not in ('ACTIVE', 'DUE_SOON', 'OVERDUE', 'CHANGES_REQUESTED') then
    raise exception 'This project allocation can no longer be changed';
  end if;

  if v_allocation.project_id <> v_project_id then
    raise exception 'The project on this allocation has changed; reload and try again';
  end if;

  if exists (
    select 1
    from public.project_submissions
    where allocation_id = v_allocation.id
  ) then
    raise exception 'A project with a submission cannot be changed';
  end if;

  update public.project_allocations
  set status = 'CANCELLED', updated_at = now()
  where id = v_allocation.id;

  insert into public.notifications(recipient_id, title, message, notification_type)
  values (
    v_student_id,
    'Project selection released',
    'Your selection for ' || v_project.title || ' was released. You can now choose another available project.',
    'PROJECT_ALLOCATION_CANCELLED'
  );

  insert into public.notifications(recipient_id, title, message, notification_type)
  select sf.faculty_id,
    'Project allocation cancelled',
    v_profile.full_name || ' released the project ' || v_project.title || '.',
    'PROJECT_ALLOCATION_CANCELLED'
  from public.subject_faculty sf
  where sf.subject_id = v_project.subject_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (
    v_student_id,
    'PROJECT_ALLOCATION_CANCELLED',
    'project_allocation',
    v_allocation.id,
    jsonb_build_object('project_id', v_project.id, 'project_code', v_project.project_code)
  );
end;
$$;

revoke all on function public.cancel_project_allocation(uuid) from public;
grant execute on function public.cancel_project_allocation(uuid) to authenticated;
