create or replace function public.can_view_project_allocation(
  p_project_id uuid,
  p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_student_id = auth.uid()
    or public.current_role() = 'SUPER_ADMIN'
    or exists (
      select 1
      from public.projects p
      join public.subject_faculty sf on sf.subject_id = p.subject_id
      where p.id = p_project_id
        and sf.faculty_id = auth.uid()
    )
$$;

drop policy if exists "allocation visibility" on public.project_allocations;
create policy "allocation visibility" on public.project_allocations for select
  using (public.can_view_project_allocation(project_id, student_id));
