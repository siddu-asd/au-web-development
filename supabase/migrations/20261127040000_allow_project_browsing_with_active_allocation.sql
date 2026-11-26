create or replace function public.get_available_projects()
returns table (
  id uuid,
  subject_id uuid,
  project_code text,
  title text,
  description text,
  problem_statement text,
  objectives text,
  requirements jsonb,
  technologies text[],
  difficulty text,
  status publication_status,
  created_at timestamptz,
  subject_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.current_role() <> 'STUDENT' then
    raise exception 'Student authentication required';
  end if;

  return query
    select p.id,p.subject_id,p.project_code,p.title,p.description,p.problem_statement,
      p.objectives,p.requirements,p.technologies,p.difficulty,p.status,p.created_at,s.subject_name
    from public.projects p
    join public.subjects s on s.id=p.subject_id
    where p.status='PUBLISHED'
      and s.status='PUBLISHED'
      and not exists (
        select 1
        from public.project_allocations a
        where a.project_id=p.id
          and a.status not in ('CANCELLED','APPROVED')
      )
    order by p.created_at desc;
end
$$;

revoke all on function public.get_available_projects() from public;
grant execute on function public.get_available_projects() to authenticated;
