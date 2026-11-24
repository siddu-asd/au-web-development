create or replace function public.create_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email, registration_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name','New User'),
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'registration_number','PENDING-' || substr(new.id::text,1,8))
  )
  on conflict(id) do nothing;
  insert into public.notifications(recipient_id,title,message,notification_type)
  select p.id,'New student registration',
    coalesce(new.raw_user_meta_data->>'full_name','New User') || ' registered for ProjectHub.',
    'NEW_REGISTRATION'
  from public.profiles p where p.role='SUPER_ADMIN';
  return new;
end;
$$;
