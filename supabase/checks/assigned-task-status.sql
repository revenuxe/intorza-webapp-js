begin;
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e70601','tasks-owner@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e70602','tasks-worker@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e70603','tasks-other@example.invalid','{}');
update public.profiles set is_pro=true,pro_expiry=now()+interval '1 day'
where id='b10d372e-09ae-4f18-9b5d-711416e70601';
update public.profiles set is_pro=false where id in
('b10d372e-09ae-4f18-9b5d-711416e70602','b10d372e-09ae-4f18-9b5d-711416e70603');
insert into public.team_members(id,company_id,user_id,name,email,work_type) values
('b10d372e-09ae-4f18-9b5d-711416e70611','b10d372e-09ae-4f18-9b5d-711416e70601','b10d372e-09ae-4f18-9b5d-711416e70602','Synthetic worker','tasks-worker@example.invalid','interior_designer'),
('b10d372e-09ae-4f18-9b5d-711416e70612','b10d372e-09ae-4f18-9b5d-711416e70601','b10d372e-09ae-4f18-9b5d-711416e70603','Synthetic other','tasks-other@example.invalid','carpenter');

set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70601',true);
insert into public.tasks(id,company_id,assigned_to,title,status) values
('b10d372e-09ae-4f18-9b5d-711416e70621','b10d372e-09ae-4f18-9b5d-711416e70601','b10d372e-09ae-4f18-9b5d-711416e70611','Synthetic assigned task','pending');
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70602',true);
do $$ declare result jsonb; affected integer; begin
  result := public.update_assigned_task_status('b10d372e-09ae-4f18-9b5d-711416e70621','completed');
  if result->>'status' <> 'completed' or result->>'completed_at' is null then raise exception 'Task completion failed'; end if;
  result := public.update_assigned_task_status('b10d372e-09ae-4f18-9b5d-711416e70621','in_progress');
  if result->>'status' <> 'in_progress' or result->>'completed_at' is not null then raise exception 'Task reopen failed'; end if;
  if result->>'title' <> 'Synthetic assigned task' then raise exception 'Task content changed'; end if;
  update public.tasks set title='Unauthorized title' where id='b10d372e-09ae-4f18-9b5d-711416e70621';
  get diagnostics affected=row_count;
  if affected <> 0 then raise exception 'Member allowed to edit task content'; end if;
  begin
    perform public.update_assigned_task_status('b10d372e-09ae-4f18-9b5d-711416e70621','invalid');
    raise exception 'Invalid task status accepted';
  exception when invalid_parameter_value then null; end;
end; $$;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70603',true);
do $$ begin
  begin
    perform public.update_assigned_task_status('b10d372e-09ae-4f18-9b5d-711416e70621','completed');
    raise exception 'Unassigned member updated task';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update public.profiles set is_pro=false where id='b10d372e-09ae-4f18-9b5d-711416e70601';
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70602',true);
do $$ begin
  begin
    perform public.update_assigned_task_status('b10d372e-09ae-4f18-9b5d-711416e70621','completed');
    raise exception 'Inactive organization entitlement bypassed';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
rollback;
select 'PASS: owner can create task; assigned free member can complete/reopen under organization Pro; task-content edits, other-member updates, invalid statuses, and inactive organizations blocked; synthetic records rolled back' as result;
