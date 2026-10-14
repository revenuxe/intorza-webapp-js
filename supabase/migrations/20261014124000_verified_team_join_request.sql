begin;
create or replace function public.submit_pending_team_join()
returns uuid language plpgsql security definer
set search_path=public,pg_temp as $$
declare u auth.users; company uuid; request_id uuid; member_name text; member_work text;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select * into u from auth.users where id=auth.uid();
  if u.email_confirmed_at is null then raise exception 'Verify your email before requesting membership' using errcode='42501'; end if;
  if coalesce(u.raw_user_meta_data->>'join_company_id','')='' then return null; end if;
  company := (u.raw_user_meta_data->>'join_company_id')::uuid;
  if not exists(select 1 from public.profiles where id=company and nullif(company_name,'') is not null) then
    raise exception 'Organization not found';
  end if;
  member_name := trim(coalesce(u.raw_user_meta_data->>'full_name',''));
  member_work := coalesce(u.raw_user_meta_data->>'join_work_type','other');
  if length(member_name) not between 1 and 100 or member_work not in
    ('carpenter','labour','plumber','electrician','painter','mason','welder','supervisor','other') then
    raise exception 'Invalid membership details';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
  if exists(select 1 from public.team_members where user_id=u.id) then return null; end if;
  select id into request_id from public.team_member_requests where user_id=u.id and company_id=company
    order by created_at desc limit 1;
  if request_id is not null then return request_id; end if;
  -- Metadata is untrusted intent, never an approval or role grant.
  insert into public.team_member_requests(user_id,company_id,name,email,phone,work_type,status)
  values(u.id,company,member_name,u.email,left(u.raw_user_meta_data->>'join_phone',50),member_work,'pending')
  returning id into request_id;
  return request_id;
end; $$;
revoke all on function public.submit_pending_team_join() from public,anon;
grant execute on function public.submit_pending_team_join() to authenticated;
commit;
