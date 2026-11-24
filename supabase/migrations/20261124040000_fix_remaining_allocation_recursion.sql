create or replace function public.can_view_project_allocation(
  p_project_id uuid,
  p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select p_student_id = auth.uid()
    or exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'SUPER_ADMIN'
    )
    or exists (
      select 1
      from public.projects project
      join public.subject_faculty assignment
        on assignment.subject_id = project.subject_id
      where project.id = p_project_id
        and assignment.faculty_id = auth.uid()
    )
$$;

drop policy if exists "own or staff allocations" on public.project_allocations;
drop policy if exists "allocation visibility" on public.project_allocations;

create policy "allocation visibility" on public.project_allocations for select
  using (public.can_view_project_allocation(project_id, student_id));

revoke all on function public.can_view_project_allocation(uuid, uuid) from public, anon;
grant execute on function public.can_view_project_allocation(uuid, uuid) to authenticated;
