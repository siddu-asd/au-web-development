create or replace function public.admin_update_faculty(
  p_faculty_id uuid,
  p_full_name text,
  p_employee_id text,
  p_subject_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty public.profiles%rowtype;
  v_subject_ids uuid[] := coalesce(p_subject_ids, '{}'::uuid[]);
begin
  if auth.uid() is null or public.current_role() <> 'SUPER_ADMIN' then
    raise exception 'Super-admin authorization required';
  end if;

  if coalesce(length(trim(p_full_name)), 0) < 2
     or length(trim(p_full_name)) > 120
     or coalesce(length(trim(p_employee_id)), 0) < 2
     or length(trim(p_employee_id)) > 64 then
    raise exception 'Provide a valid faculty name and employee ID';
  end if;

  select * into v_faculty
  from public.profiles
  where id = p_faculty_id and role = 'FACULTY'
  for update;

  if not found then
    raise exception 'Faculty account not found';
  end if;

  if cardinality(v_subject_ids) <> (
    select count(distinct subject_id)
    from unnest(v_subject_ids) as selected(subject_id)
  ) then
    raise exception 'Duplicate subject assignments are not allowed';
  end if;

  if cardinality(v_subject_ids) <> (
    select count(*)
    from public.subjects
    where id = any(v_subject_ids)
  ) then
    raise exception 'One or more selected subjects do not exist';
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      registration_number = trim(p_employee_id),
      updated_at = now()
  where id = p_faculty_id;

  delete from public.subject_faculty where faculty_id = p_faculty_id;
  insert into public.subject_faculty(subject_id, faculty_id)
  select subject_id, p_faculty_id
  from unnest(v_subject_ids) as selected(subject_id);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'FACULTY_PROFILE_UPDATED',
    'profile',
    p_faculty_id,
    jsonb_build_object(
      'previous_employee_id', v_faculty.registration_number,
      'employee_id', trim(p_employee_id),
      'subject_ids', v_subject_ids
    )
  );
end;
$$;

revoke all on function public.admin_update_faculty(uuid, text, text, uuid[]) from public;
grant execute on function public.admin_update_faculty(uuid, text, text, uuid[]) to authenticated;
