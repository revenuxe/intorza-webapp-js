begin;

create or replace function public.admin_set_pro_access(
  p_admin uuid,
  p_user uuid,
  p_days integer,
  p_note text default 'Admin Pro access update'
) returns timestamptz language plpgsql security definer set search_path=public,pg_temp as $$
declare v_expiry timestamptz; v_is_admin boolean;
begin
  select public.has_role(auth.uid(), 'admin'::public.app_role) into v_is_admin;
  if not v_is_admin or p_admin is null or p_admin <> auth.uid() then raise exception 'Admin access required'; end if;
  if p_user is null or p_days < 0 or p_days > 3650 then raise exception 'Choose between 0 and 3650 days'; end if;
  if p_days = 0 then
    update public.profiles set is_pro=false, pro_expiry=now(), payment_status='admin_revoked' where id=p_user;
    insert into public.subscription_events(user_id,event,notes,actor) values(p_user,'pro_revoked',coalesce(nullif(p_note,''),'Admin revoked Pro access'),p_admin::text);
    return null;
  end if;
  v_expiry := now() + make_interval(days => p_days);
  update public.profiles set is_pro=true, pro_since=coalesce(pro_since,now()), pro_plan='admin', pro_expiry=v_expiry, payment_status='admin_active' where id=p_user;
  if not found then raise exception 'User profile was not found'; end if;
  insert into public.subscription_events(user_id,event,notes,actor) values(p_user,'pro_admin_enabled',coalesce(nullif(p_note,''),'Admin granted Pro access') || ' for ' || p_days || ' days',p_admin::text);
  return v_expiry;
end;
$$;

grant execute on function public.admin_set_pro_access(uuid,uuid,integer,text) to authenticated;
commit;
