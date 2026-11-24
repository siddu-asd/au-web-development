drop policy if exists "profiles read own or staff" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "published subjects read" on public.subjects;
drop policy if exists "staff manage subjects" on public.subjects;
drop policy if exists "published projects read" on public.projects;
drop policy if exists "staff manage projects" on public.projects;
drop policy if exists "own or staff allocations" on public.project_allocations;
drop policy if exists "own checklist" on public.student_checklist_items;
drop policy if exists "own checklist update" on public.student_checklist_items;
drop policy if exists "own progress" on public.daily_progress_logs;
drop policy if exists "own progress insert" on public.daily_progress_logs;
drop policy if exists "own or staff submissions" on public.project_submissions;
drop policy if exists "own submission insert" on public.project_submissions;
drop policy if exists "staff submission review" on public.project_submissions;
drop policy if exists "own notifications" on public.notifications;

create or replace function public.is_subject_staff(p_subject_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from public.subject_faculty sf
    where sf.subject_id = p_subject_id and sf.faculty_id = auth.uid()
  )
$$;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.id and public.current_role() <> 'SUPER_ADMIN' then
    if new.role <> old.role or new.account_status <> old.account_status
       or new.registration_number <> old.registration_number or new.email <> old.email
       or new.id <> old.id then
      raise exception 'Profile role, status, and registration number are admin-managed';
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles
for each row execute function public.protect_profile_fields();

create policy "profile visibility" on public.profiles for select using (
  id = auth.uid()
  or public.current_role() = 'SUPER_ADMIN'
  or (public.current_role() = 'FACULTY' and exists (
    select 1 from public.project_allocations a
    join public.projects p on p.id = a.project_id
    join public.subject_faculty sf on sf.subject_id = p.subject_id
    where a.student_id = profiles.id and sf.faculty_id = auth.uid()
  ))
);
create policy "profile self update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "superadmin profile management" on public.profiles for update
  using (public.current_role() = 'SUPER_ADMIN') with check (public.current_role() = 'SUPER_ADMIN');

create policy "subject visibility" on public.subjects for select
  using (status = 'PUBLISHED' or public.is_subject_staff(id));
create policy "subject admin insert" on public.subjects for insert
  with check (public.current_role() = 'SUPER_ADMIN');
create policy "subject staff update" on public.subjects for update
  using (public.is_subject_staff(id)) with check (public.is_subject_staff(id));
create policy "subject admin delete" on public.subjects for delete
  using (public.current_role() = 'SUPER_ADMIN');

create policy "subject faculty visibility" on public.subject_faculty for select
  using (faculty_id = auth.uid() or public.current_role() = 'SUPER_ADMIN');
create policy "subject faculty admin management" on public.subject_faculty for all
  using (public.current_role() = 'SUPER_ADMIN')
  with check (public.current_role() = 'SUPER_ADMIN' and exists(
    select 1 from public.profiles p where p.id=faculty_id and p.role='FACULTY'
  ));

create policy "project visibility" on public.projects for select using (
  status = 'PUBLISHED'
  or public.is_subject_staff(subject_id)
  or exists(select 1 from public.project_allocations a where a.project_id = projects.id and a.student_id = auth.uid())
);
create policy "project staff insert" on public.projects for insert
  with check (public.is_subject_staff(subject_id));
create policy "project staff update" on public.projects for update
  using (public.is_subject_staff(subject_id)) with check (public.is_subject_staff(subject_id));
create policy "project admin delete" on public.projects for delete
  using (public.current_role() = 'SUPER_ADMIN');

create policy "requirement version visibility" on public.project_requirement_versions for select
  using (exists(select 1 from public.projects p where p.id = project_id and (
    p.status = 'PUBLISHED' or public.is_subject_staff(p.subject_id)
    or exists(select 1 from public.project_allocations a where a.project_id = p.id and a.student_id = auth.uid())
  )));
create policy "checklist template visibility" on public.project_checklist_templates for select
  using (exists(select 1 from public.projects p where p.id = project_id and (
    p.status = 'PUBLISHED' or public.is_subject_staff(p.subject_id)
    or exists(select 1 from public.project_allocations a where a.project_id = p.id and a.student_id = auth.uid())
  )));
create policy "checklist template staff write" on public.project_checklist_templates for all
  using (exists(select 1 from public.projects p where p.id = project_id and public.is_subject_staff(p.subject_id)))
  with check (exists(select 1 from public.projects p where p.id = project_id and public.is_subject_staff(p.subject_id)));

create policy "allocation visibility" on public.project_allocations for select using (
  student_id = auth.uid()
  or public.current_role() = 'SUPER_ADMIN'
  or exists(select 1 from public.projects p where p.id = project_id and public.is_subject_staff(p.subject_id))
);

create policy "checklist own or subject faculty read" on public.student_checklist_items for select using (
  exists(select 1 from public.project_allocations a where a.id = allocation_id and a.student_id = auth.uid())
  or public.current_role() = 'SUPER_ADMIN'
  or exists(select 1 from public.project_allocations a join public.projects p on p.id = a.project_id
    where a.id = allocation_id and public.is_subject_staff(p.subject_id))
);

create policy "progress own or assigned faculty read" on public.daily_progress_logs for select using (
  student_id = auth.uid() or public.current_role() = 'SUPER_ADMIN'
  or exists(select 1 from public.project_allocations a join public.projects p on p.id = a.project_id
    where a.id = allocation_id and public.is_subject_staff(p.subject_id))
);

create policy "submission own or assigned faculty read" on public.project_submissions for select using (
  student_id = auth.uid() or public.current_role() = 'SUPER_ADMIN'
  or exists(select 1 from public.project_allocations a join public.projects p on p.id = a.project_id
    where a.id = allocation_id and public.is_subject_staff(p.subject_id))
);
create policy "notification owner read" on public.notifications for select
  using (recipient_id = auth.uid());
create policy "notification owner update" on public.notifications for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "audit admin read" on public.audit_logs for select
  using (public.current_role() = 'SUPER_ADMIN');

create or replace function public.protect_notification_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.recipient_id is distinct from old.recipient_id
    or new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.notification_type is distinct from old.notification_type
    or new.created_at is distinct from old.created_at then
    raise exception 'Notification content cannot be modified by its recipient';
  end if;
  return new;
end
$$;
drop trigger if exists protect_notification_content on public.notifications;
create trigger protect_notification_content before update on public.notifications
for each row execute function public.protect_notification_content();

create or replace function public.snapshot_project_requirements()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_version integer;
begin
  if tg_op = 'UPDATE' and row(new.subject_id,new.project_code,new.title,new.description,new.problem_statement,new.objectives,new.requirements,new.technologies,new.difficulty)
    is not distinct from row(old.subject_id,old.project_code,old.title,old.description,old.problem_statement,old.objectives,old.requirements,old.technologies,old.difficulty) then
    return new;
  end if;
  select coalesce(max(version_number),0)+1 into v_version
    from public.project_requirement_versions where project_id = new.id;
  insert into public.project_requirement_versions(project_id,version_number,requirement_snapshot)
  values(new.id,v_version,jsonb_build_object(
    'subject_id',new.subject_id,'project_code',new.project_code,'title',new.title,
    'description',new.description,'problem_statement',new.problem_statement,
    'objectives',new.objectives,'requirements',new.requirements,
    'technologies',new.technologies,'difficulty',new.difficulty
  ));
  return new;
end
$$;
drop trigger if exists project_requirement_snapshot on public.projects;
create trigger project_requirement_snapshot after insert or update on public.projects
for each row execute function public.snapshot_project_requirements();

create or replace function public.seed_project_checklist()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_day integer;
  v_task text;
  v_order integer;
  v_tasks text[] := array[
    'Understand the problem statement','Create the project folder','Plan the website structure',
    'Create the homepage','Build the main navigation','Create all required pages',
    'Apply global styles','Create responsive layouts','Add typography and colors',
    'Complete page designs','Add images and icons','Implement navigation behavior',
    'Add JavaScript event listeners','Implement DOM interactions','Add form validation',
    'Implement core project features','Add search and filtering','Validate user inputs',
    'Implement data persistence','Create dynamic content','Test all functionality',
    'Fix identified bugs','Test mobile responsiveness','Improve UI and accessibility',
    'Verify all project requirements','Optimize performance','Complete final testing',
    'Deploy the project to Vercel','Push source code to GitHub','Submit deployment and repository links'
  ];
begin
  for v_day in 1..10 loop
    for v_order in 1..3 loop
      v_task := v_tasks[(v_day-1)*3+v_order];
      insert into public.project_checklist_templates(project_id,task_title,day_number,sort_order)
      values(new.id,v_task,v_day,v_order);
    end loop;
  end loop;
  return new;
end
$$;
drop trigger if exists project_seed_checklist on public.projects;
create trigger project_seed_checklist after insert on public.projects
for each row execute function public.seed_project_checklist();

create or replace function public.get_available_projects()
returns table (
  id uuid,subject_id uuid,project_code text,title text,description text,
  problem_statement text,objectives text,requirements jsonb,technologies text[],
  difficulty text,status publication_status,created_at timestamptz,subject_name text
) language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or public.current_role() <> 'STUDENT' then
    raise exception 'Student authentication required';
  end if;
  if exists(select 1 from public.project_allocations a where a.student_id=auth.uid()
    and a.status not in ('CANCELLED','APPROVED')) then
    return;
  end if;
  return query
    select p.id,p.subject_id,p.project_code,p.title,p.description,p.problem_statement,
      p.objectives,p.requirements,p.technologies,p.difficulty,p.status,p.created_at,s.subject_name
    from public.projects p join public.subjects s on s.id=p.subject_id
    where p.status='PUBLISHED'
      and s.status='PUBLISHED'
      and not exists(select 1 from public.project_allocations a where a.project_id=p.id
        and a.status not in ('CANCELLED','APPROVED'))
    order by p.created_at desc;
end
$$;

create or replace function public.toggle_checklist_item(p_item_id uuid,p_is_completed boolean,p_student_notes text default null)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_allocation_id uuid;
  v_student_id uuid := auth.uid();
  v_done integer;
  v_total integer;
  v_progress numeric(5,2);
begin
  update public.student_checklist_items i
  set is_completed = p_is_completed,
      completed_at = case when p_is_completed then coalesce(i.completed_at,now()) else null end,
      student_notes = left(p_student_notes,2000)
  from public.project_allocations a
  where i.id = p_item_id and a.id = i.allocation_id
    and a.student_id = v_student_id and a.status in ('ACTIVE','DUE_SOON','OVERDUE','CHANGES_REQUESTED')
  returning i.allocation_id into v_allocation_id;
  if v_allocation_id is null then raise exception 'Checklist item not found or allocation is not editable'; end if;
  select count(*) filter(where is_completed),count(*) into v_done,v_total
    from public.student_checklist_items where allocation_id = v_allocation_id;
  v_progress := case when v_total=0 then 0 else round(v_done*100.0/v_total,2) end;
  insert into public.daily_progress_logs(allocation_id,student_id,progress_percentage,activity_date,daily_summary)
  values(v_allocation_id,v_student_id,v_progress,(now() at time zone 'Asia/Kolkata')::date,'Checklist updated')
  on conflict(allocation_id,activity_date) do update
    set progress_percentage=excluded.progress_percentage,daily_summary=excluded.daily_summary;
  return v_progress;
end
$$;

create or replace function public.submit_project(p_allocation_id uuid,p_vercel_url text,p_github_url text,p_description text,p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_allocation public.project_allocations%rowtype;
  v_submission_id uuid;
  v_version integer;
  v_status text;
  v_vercel_host text;
  v_github_host text;
begin
  select * into v_allocation from public.project_allocations
    where id=p_allocation_id and student_id=auth.uid() for update;
  if not found or v_allocation.status not in ('ACTIVE','DUE_SOON','OVERDUE','CHANGES_REQUESTED') then
    raise exception 'Project allocation is not available for submission';
  end if;
  if length(trim(p_description)) < 10 or length(p_description)>10000 then
    raise exception 'Provide a project description between 10 and 10000 characters';
  end if;
  v_vercel_host := lower(split_part(split_part(trim(p_vercel_url),'://',2),'/',1));
  v_github_host := lower(split_part(split_part(trim(p_github_url),'://',2),'/',1));
  if lower(split_part(trim(p_vercel_url),'://',1)) <> 'https'
    or position('@' in v_vercel_host)>0
    or (v_vercel_host not like '%.vercel.app' and v_vercel_host <> 'vercel.app') then
    raise exception 'Enter a valid HTTPS Vercel deployment URL';
  end if;
  if lower(split_part(trim(p_github_url),'://',1)) <> 'https'
    or position('@' in v_github_host)>0 or v_github_host <> 'github.com'
    or array_length(string_to_array(trim(both '/' from split_part(split_part(trim(p_github_url),'://',2), '?',1)),'/'),1) < 2 then
    raise exception 'Enter a valid HTTPS GitHub repository URL';
  end if;
  select coalesce(max(submission_version),0)+1 into v_version from public.project_submissions where allocation_id=p_allocation_id;
  v_status := case when now()>v_allocation.deadline then 'Late Submission' else 'Submitted' end;
  insert into public.project_submissions(allocation_id,student_id,vercel_url,github_url,description,submission_version,submission_status)
  values(p_allocation_id,auth.uid(),trim(p_vercel_url),trim(p_github_url),trim(p_description)||case when coalesce(p_notes,'')='' then '' else E'\n\nNotes: '||left(p_notes,5000) end,v_version,v_status)
  returning id into v_submission_id;
  update public.project_allocations set status='SUBMITTED',updated_at=now() where id=p_allocation_id;
  insert into public.notifications(recipient_id,title,message,notification_type)
  select sf.faculty_id,'New project submission','A student submitted a project for review.','SUBMISSION_RECEIVED'
  from public.project_allocations a join public.projects p on p.id=a.project_id
  join public.subject_faculty sf on sf.subject_id=p.subject_id where a.id=p_allocation_id
  on conflict do nothing;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'SUBMITTED','project_submission',v_submission_id,jsonb_build_object('version',v_version,'status',v_status));
  return v_submission_id;
end
$$;

create or replace function public.review_submission(p_submission_id uuid,p_status text,p_feedback text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_submission public.project_submissions%rowtype;
begin
  if p_status is null or p_status not in ('Under Review','Changes Requested','Approved','Rejected') then
    raise exception 'Invalid review status';
  end if;
  select s.* into v_submission from public.project_submissions s
    join public.project_allocations a on a.id=s.allocation_id
    join public.projects p on p.id=a.project_id
    where s.id=p_submission_id and public.is_subject_staff(p.subject_id)
    for update of s;
  if not found then raise exception 'Submission not found or not assigned to this faculty'; end if;
  update public.project_submissions set submission_status=p_status,faculty_feedback=left(p_feedback,5000),
    reviewed_by=auth.uid(),reviewed_at=now() where id=p_submission_id;
  update public.project_allocations set status=case p_status
    when 'Approved' then 'APPROVED' when 'Changes Requested' then 'CHANGES_REQUESTED'
    when 'Under Review' then 'UNDER_REVIEW' else status end,updated_at=now()
    where id=v_submission.allocation_id;
  insert into public.notifications(recipient_id,title,message,notification_type)
  values(v_submission.student_id,'Submission reviewed',coalesce(nullif(p_feedback,''),'Your submission status is now '||p_status),p_status);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'SUBMISSION_REVIEWED','project_submission',p_submission_id,jsonb_build_object('status',p_status));
end
$$;

create or replace function public.extend_project_deadline(p_allocation_id uuid,p_new_deadline timestamptz,p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_allocation public.project_allocations%rowtype;
begin
  select a.* into v_allocation from public.project_allocations a
    join public.projects p on p.id=a.project_id
    where a.id=p_allocation_id and public.is_subject_staff(p.subject_id) for update of a;
  if not found then raise exception 'Allocation not found or not managed by this faculty'; end if;
  if p_new_deadline <= v_allocation.deadline or p_new_deadline <= now() or coalesce(length(trim(p_reason)),0) < 5 then
    raise exception 'A future extended deadline and a reason are required';
  end if;
  update public.project_allocations set deadline=p_new_deadline,
    status=case when status='OVERDUE' then 'ACTIVE' else status end,updated_at=now()
    where id=p_allocation_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'DEADLINE_EXTENDED','project_allocation',p_allocation_id,
    jsonb_build_object('old_deadline',v_allocation.deadline,'new_deadline',p_new_deadline,'reason',left(p_reason,2000)));
end
$$;

revoke all on function public.toggle_checklist_item(uuid,boolean,text) from public;
revoke all on function public.submit_project(uuid,text,text,text,text) from public;
revoke all on function public.review_submission(uuid,text,text) from public;
revoke all on function public.extend_project_deadline(uuid,timestamptz,text) from public;
revoke all on function public.allocate_project(uuid) from public;
revoke all on function public.get_available_projects() from public;
grant execute on function public.allocate_project(uuid) to authenticated;
grant execute on function public.get_available_projects() to authenticated;
grant execute on function public.toggle_checklist_item(uuid,boolean,text) to authenticated;
grant execute on function public.submit_project(uuid,text,text,text,text) to authenticated;
grant execute on function public.review_submission(uuid,text,text) to authenticated;
grant execute on function public.extend_project_deadline(uuid,timestamptz,text) to authenticated;
