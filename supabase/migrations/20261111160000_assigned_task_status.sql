begin;
-- Members may change status only, not task ownership, assignment, or content.
create or replace function public.update_assigned_task_status(p_task_id uuid, p_status text)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare task public.tasks; result jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  if p_status is null or p_status not in ('pending','in_progress','completed') then
    raise exception 'Invalid task status' using errcode='22023';
  end if;
  select * into task from public.tasks where id=p_task_id for update;
  if not found or not exists(select 1 from public.team_members tm
    where tm.id=task.assigned_to and tm.user_id=auth.uid() and tm.company_id=task.company_id) then
    raise exception 'Task is not assigned to your account' using errcode='42501';
  end if;
  if not public.is_pro_user(task.company_id) then
    raise exception 'Your organization needs active Pro access to update tasks' using errcode='42501';
  end if;
  update public.tasks as t set status=p_status,
    completed_at=case when p_status='completed' then coalesce(t.completed_at,now()) else null end
    where t.id=task.id returning to_jsonb(t) into result;
  return result;
end; $$;
revoke all on function public.update_assigned_task_status(uuid,text) from public, anon;
grant execute on function public.update_assigned_task_status(uuid,text) to authenticated;
commit;
