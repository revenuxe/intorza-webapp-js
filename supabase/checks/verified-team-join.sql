insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e70101','join-owner@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e70102','join-worker@example.invalid',
'{"full_name":"Synthetic worker","join_company_id":"b10d372e-09ae-4f18-9b5d-711416e70101","join_work_type":"carpenter","status":"approved","email":"forged@example.invalid"}');
update public.profiles set company_name='Synthetic join company' where id='b10d372e-09ae-4f18-9b5d-711416e70101';
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70102',true);
do $$ declare denied boolean := false; begin
  begin perform public.submit_pending_team_join(); exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Unverified join request allowed'; end if;
end; $$;
reset role;
update auth.users set email_confirmed_at=now() where id='b10d372e-09ae-4f18-9b5d-711416e70102';
set local role authenticated;
do $$ declare a uuid; b uuid; begin
  a := public.submit_pending_team_join();
  b := public.submit_pending_team_join();
  if a is null or a <> b then raise exception 'Join request not idempotent'; end if;
  if not exists(select 1 from public.team_member_requests where id=a and user_id=auth.uid()
    and status='pending' and email='join-worker@example.invalid') then raise exception 'Trusted identity/pending state incorrect'; end if;
end; $$;
reset role;
select 'PASS: unverified join denied, verified request submitted once, authoritative email and pending state enforced' as result;
