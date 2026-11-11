begin;

-- Team registrations use organization approval instead of an email-verification step.
-- Validate untrusted signup intent before confirming the account. This grants no membership.
create or replace function public.prepare_team_registration()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare company uuid; member_name text; member_work text;
begin
  if coalesce(new.raw_user_meta_data->>'is_team_member', '') <> 'true'
     or coalesce(new.raw_user_meta_data->>'join_company_id', '') = '' then
    return new;
  end if;
  company := (new.raw_user_meta_data->>'join_company_id')::uuid;
  if not exists(select 1 from public.profiles where id=company and nullif(trim(company_name),'') is not null) then
    raise exception 'Organization not found';
  end if;
  member_name := trim(coalesce(new.raw_user_meta_data->>'full_name',''));
  member_work := coalesce(new.raw_user_meta_data->>'join_work_type','other');
  if new.email is null or length(member_name) not between 1 and 100
     or not (member_work = any(enum_range(null::public.work_type)::text[])) then
    raise exception 'Invalid membership details';
  end if;
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end; $$;
revoke all on function public.prepare_team_registration() from public, anon, authenticated;

create or replace function public.queue_team_registration()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if coalesce(new.raw_user_meta_data->>'is_team_member','') = 'true'
     and coalesce(new.raw_user_meta_data->>'join_company_id','') <> '' then
    insert into public.team_member_requests(user_id, company_id, name, email, phone, work_type, status)
    values(new.id, (new.raw_user_meta_data->>'join_company_id')::uuid,
      trim(new.raw_user_meta_data->>'full_name'), new.email,
      left(new.raw_user_meta_data->>'join_phone',50),
      coalesce(new.raw_user_meta_data->>'join_work_type','other'), 'pending');
  end if;
  return new;
end; $$;
revoke all on function public.queue_team_registration() from public, anon, authenticated;

drop trigger if exists prepare_team_registration on auth.users;
create trigger prepare_team_registration before insert on auth.users
for each row execute function public.prepare_team_registration();
drop trigger if exists queue_team_registration on auth.users;
create trigger queue_team_registration after insert on auth.users
for each row execute function public.queue_team_registration();

commit;
