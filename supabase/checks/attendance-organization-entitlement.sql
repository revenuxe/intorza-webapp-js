begin;
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e70501','attendance-owner@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e70502','attendance-worker@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e70503','attendance-other@example.invalid','{}');
update public.profiles set is_pro=true,pro_expiry=now()+interval '1 day'
where id='b10d372e-09ae-4f18-9b5d-711416e70501';
update public.profiles set is_pro=false where id in
('b10d372e-09ae-4f18-9b5d-711416e70502','b10d372e-09ae-4f18-9b5d-711416e70503');
insert into public.team_members(id,company_id,user_id,name,email,work_type) values
('b10d372e-09ae-4f18-9b5d-711416e70511','b10d372e-09ae-4f18-9b5d-711416e70501','b10d372e-09ae-4f18-9b5d-711416e70502','Synthetic worker','attendance-worker@example.invalid','interior_designer'),
('b10d372e-09ae-4f18-9b5d-711416e70512','b10d372e-09ae-4f18-9b5d-711416e70501','b10d372e-09ae-4f18-9b5d-711416e70503','Synthetic other','attendance-other@example.invalid','carpenter');
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70502',true);
do $$ declare attendance_id uuid; affected integer; begin
  if public.is_pro_user(auth.uid()) then raise exception 'Test worker must not be Pro'; end if;
  insert into public.attendance(team_member_id,clock_in)
  values('b10d372e-09ae-4f18-9b5d-711416e70511',now()) returning id into attendance_id;
  update public.attendance set clock_out=now() where id=attendance_id;
  get diagnostics affected=row_count;
  if affected <> 1 then raise exception 'Clock-out failed'; end if;
  begin
    insert into public.attendance(team_member_id,clock_in)
    values('b10d372e-09ae-4f18-9b5d-711416e70512',now());
    raise exception 'Another member attendance insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.attendance set team_member_id='b10d372e-09ae-4f18-9b5d-711416e70512' where id=attendance_id;
    raise exception 'Attendance reassignment allowed';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update public.profiles set is_pro=false where id='b10d372e-09ae-4f18-9b5d-711416e70501';
update public.profiles set is_pro=true,pro_expiry=now()+interval '1 day' where id='b10d372e-09ae-4f18-9b5d-711416e70502';
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70502',true);
do $$ begin
  begin
    insert into public.attendance(team_member_id,clock_in)
    values('b10d372e-09ae-4f18-9b5d-711416e70511',now());
    raise exception 'Personal subscription bypassed organization requirement';
  exception when insufficient_privilege then null; end;
  begin
    update public.attendance set clock_out=now() where team_member_id='b10d372e-09ae-4f18-9b5d-711416e70511';
    raise exception 'Clock-out bypassed organization requirement';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
rollback;
select 'PASS: organization Pro enables own clock-in/out for free members; other-member writes and personal-subscription bypass blocked; all synthetic records rolled back' as result;
