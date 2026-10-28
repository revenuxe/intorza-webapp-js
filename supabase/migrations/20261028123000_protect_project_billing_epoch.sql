begin;
-- Grandfathering relies on creation time. Owner CRUD must not let a new project
-- impersonate an older, already-entitled project to bypass the delivery fee.
create or replace function public.protect_quotation_project_created_at()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is not null then
    if tg_op='INSERT' then new.created_at:=now();
    elsif new.created_at is distinct from old.created_at then
      raise exception 'Project creation time cannot be changed' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.protect_quotation_project_created_at() from public,anon,authenticated;
create trigger protect_quotation_project_created_at
before insert or update of created_at on public.quotation_plan_projects
for each row execute function public.protect_quotation_project_created_at();
commit;
