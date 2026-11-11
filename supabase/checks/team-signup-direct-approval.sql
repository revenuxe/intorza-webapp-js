begin;
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e70301','direct-owner@example.invalid','{}');
update public.profiles set company_name='Synthetic approval organization'
where id='b10d372e-09ae-4f18-9b5d-711416e70301';
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e70302','direct-worker@example.invalid',
'{"is_team_member":true,"full_name":"Synthetic designer","join_company_id":"b10d372e-09ae-4f18-9b5d-711416e70301","join_work_type":"interior_designer","status":"approved","email":"forged@example.invalid"}');
do $$ begin
  if (select email_confirmed_at from auth.users where id='b10d372e-09ae-4f18-9b5d-711416e70302') is null then
    raise exception 'Team signup still requires email confirmation';
  end if;
  if (select email_confirmed_at from auth.users where id='b10d372e-09ae-4f18-9b5d-711416e70301') is not null then
    raise exception 'Non-team email confirmation changed';
  end if;
  if not exists(select 1 from public.team_member_requests
    where user_id='b10d372e-09ae-4f18-9b5d-711416e70302'
    and company_id='b10d372e-09ae-4f18-9b5d-711416e70301'
    and email='direct-worker@example.invalid' and status='pending' and work_type='interior_designer') then
    raise exception 'Pending request not created with authoritative identity';
  end if;
  if exists(select 1 from public.team_members where user_id='b10d372e-09ae-4f18-9b5d-711416e70302') then
    raise exception 'Membership granted before approval';
  end if;
  begin
    insert into auth.users(id,email,raw_user_meta_data) values
    ('b10d372e-09ae-4f18-9b5d-711416e70303','invalid-worker@example.invalid',
    '{"is_team_member":true,"full_name":"Invalid worker","join_company_id":"b10d372e-09ae-4f18-9b5d-711416e70301","join_work_type":"invalid_role"}');
    raise exception 'Invalid profession was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid membership details' then raise; end if;
  end;
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70302',true);
select public.submit_pending_team_join();
reset role;
do $$ begin
  if (select count(*) from public.team_member_requests where user_id='b10d372e-09ae-4f18-9b5d-711416e70302') <> 1 then
    raise exception 'Duplicate join requests created';
  end if;
end; $$;
rollback;
select 'PASS: direct pending approval, no email step, no early membership, valid roles, no duplicates, regular signup unchanged; synthetic records rolled back' as result;
