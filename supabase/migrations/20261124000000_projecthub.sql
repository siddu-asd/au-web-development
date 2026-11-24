create extension if not exists "pgcrypto";

do $$ begin
  create type app_role as enum ('SUPER_ADMIN','FACULTY','STUDENT');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type account_status as enum ('ACTIVE','INACTIVE','SUSPENDED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type publication_status as enum ('DRAFT','PUBLISHED','ARCHIVED');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  registration_number text not null unique,
  role app_role not null default 'STUDENT',
  account_status account_status not null default 'ACTIVE',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null unique,
  subject_name text not null,
  description text,
  status publication_status not null default 'DRAFT',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.subject_faculty (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(subject_id, faculty_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  project_code text not null unique,
  title text not null,
  description text,
  problem_statement text,
  objectives text,
  requirements jsonb not null default '{}'::jsonb,
  technologies text[] not null default '{}',
  difficulty text not null default 'Medium' check (difficulty in ('Easy','Medium','Hard')),
  status publication_status not null default 'DRAFT',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_requirement_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  requirement_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(project_id, version_number)
);

create table if not exists public.project_allocations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  allocation_date timestamptz not null default now(),
  deadline timestamptz not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DUE_SOON','OVERDUE','SUBMITTED','UNDER_REVIEW','APPROVED','CHANGES_REQUESTED','CANCELLED')),
  allocated_by uuid references public.profiles(id),
  requirement_version_id uuid references public.project_requirement_versions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_active_allocation_uidx
  on public.project_allocations(project_id) where status not in ('CANCELLED','APPROVED');
create unique index if not exists student_active_allocation_uidx
  on public.project_allocations(student_id) where status not in ('CANCELLED','APPROVED');

create table if not exists public.project_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_title text not null,
  task_description text,
  day_number integer not null check (day_number between 1 and 10),
  sort_order integer not null default 0
);

create table if not exists public.student_checklist_items (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.project_allocations(id) on delete cascade,
  template_id uuid references public.project_checklist_templates(id) on delete set null,
  task_title_snapshot text not null,
  day_number integer not null check (day_number between 1 and 10),
  is_completed boolean not null default false,
  completed_at timestamptz,
  student_notes text,
  unique(allocation_id, template_id)
);

create table if not exists public.daily_progress_logs (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.project_allocations(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  progress_percentage numeric(5,2) not null check (progress_percentage between 0 and 100),
  activity_date date not null,
  daily_summary text,
  created_at timestamptz not null default now(),
  unique(allocation_id, activity_date)
);

create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.project_allocations(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  vercel_url text not null,
  github_url text not null,
  description text,
  submission_version integer not null default 1,
  submission_status text not null default 'Submitted' check (submission_status in ('Submitted','Under Review','Changes Requested','Approved','Rejected','Late Submission')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  faculty_feedback text,
  unique(allocation_id, submission_version)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_faculty enable row level security;
alter table public.projects enable row level security;
alter table public.project_requirement_versions enable row level security;
alter table public.project_allocations enable row level security;
alter table public.project_checklist_templates enable row level security;
alter table public.student_checklist_items enable row level security;
alter table public.daily_progress_logs enable row level security;
alter table public.project_submissions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_role()
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "profiles read own or staff" on public.profiles for select
  using (id = auth.uid() or public.current_role() in ('SUPER_ADMIN','FACULTY'));
create policy "profiles update own" on public.profiles for update using (id = auth.uid());

create policy "published subjects read" on public.subjects for select
  using (status = 'PUBLISHED' or public.current_role() in ('SUPER_ADMIN','FACULTY'));
create policy "staff manage subjects" on public.subjects for all
  using (public.current_role() in ('SUPER_ADMIN','FACULTY'))
  with check (public.current_role() in ('SUPER_ADMIN','FACULTY'));

create policy "published projects read" on public.projects for select
  using (status = 'PUBLISHED' or public.current_role() in ('SUPER_ADMIN','FACULTY'));
create policy "staff manage projects" on public.projects for all
  using (public.current_role() in ('SUPER_ADMIN','FACULTY'))
  with check (public.current_role() in ('SUPER_ADMIN','FACULTY'));

create policy "own or staff allocations" on public.project_allocations for select
  using (student_id = auth.uid() or public.current_role() in ('SUPER_ADMIN','FACULTY'));
create policy "own checklist" on public.student_checklist_items for select
  using (allocation_id in (select id from public.project_allocations where student_id = auth.uid())
    or public.current_role() in ('SUPER_ADMIN','FACULTY'));
create policy "own checklist update" on public.student_checklist_items for update
  using (allocation_id in (select id from public.project_allocations where student_id = auth.uid()));

create policy "own progress" on public.daily_progress_logs for select
  using (student_id = auth.uid() or public.current_role() in ('SUPER_ADMIN','FACULTY'));
create policy "own progress insert" on public.daily_progress_logs for insert
  with check (student_id = auth.uid());

create policy "own or staff submissions" on public.project_submissions for select
  using (student_id = auth.uid() or public.current_role() in ('SUPER_ADMIN','FACULTY'));
create policy "own submission insert" on public.project_submissions for insert
  with check (student_id = auth.uid());
create policy "staff submission review" on public.project_submissions for update
  using (public.current_role() in ('SUPER_ADMIN','FACULTY'));

create policy "own notifications" on public.notifications for all
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create or replace function public.allocate_project(p_project_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_project public.projects%rowtype;
  v_allocation_id uuid;
  v_deadline timestamptz;
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

  v_deadline := now() + interval '10 days';
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
    values(v_allocation_id, v_template.id, v_template.task_title, v_template.day_number);
  end loop;

  insert into public.notifications(recipient_id, title, message, notification_type)
  values(v_student_id, 'Project allocated', 'Your project has been successfully allocated. You have 10 days to complete it.', 'PROJECT_ALLOCATED');
  insert into public.notifications(recipient_id, title, message, notification_type)
  select sf.faculty_id, 'New project allocation',
    v_profile.full_name || ' selected ' || v_project.title || '.', 'PROJECT_ALLOCATED'
  from public.subject_faculty sf where sf.subject_id = v_project.subject_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values(v_student_id, 'PROJECT_ALLOCATED', 'project', p_project_id, jsonb_build_object('allocation_id', v_allocation_id));
  return v_allocation_id;
end;
$$;

create or replace function public.create_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email, registration_number, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name','New User'),
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'registration_number','PENDING-' || substr(new.id::text,1,8)),
    case
      when coalesce(new.raw_user_meta_data->>'role','STUDENT') = 'FACULTY' then 'STUDENT'
      else 'STUDENT'
    end
  )
  on conflict(id) do nothing;
  insert into public.notifications(recipient_id,title,message,notification_type)
  select p.id,'New student registration',new.raw_user_meta_data->>'full_name' || ' registered for ProjectHub.','NEW_REGISTRATION'
  from public.profiles p where p.role='SUPER_ADMIN';
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.create_profile();
