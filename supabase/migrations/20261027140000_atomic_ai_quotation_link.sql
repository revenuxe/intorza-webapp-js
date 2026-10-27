begin;
-- Keep AI provenance in the same transaction as the quotation, before any
-- browser read-back/identity reconciliation can fail or the browser can close.
create or replace function public.save_ai_quotation(p_id uuid, p_payload jsonb, p_project_id uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp
as $$
declare saved jsonb; project public.quotation_plan_projects;
begin
  select * into project from public.quotation_plan_projects
  where id=p_project_id and user_id=auth.uid() and estimate is not null for update;
  if not found then raise exception 'AI project not found or access denied' using errcode='42501'; end if;
  if project.quotation_id is not null and project.quotation_id is distinct from p_id then
    raise exception 'AI project already belongs to another quotation' using errcode='42501';
  end if;
  saved := public.save_quotation(p_id,p_payload);
  update public.quotation_plan_projects set quotation_id=(saved->>'id')::uuid,updated_at=now()
  where id=p_project_id and user_id=auth.uid();
  if not found then raise exception 'AI project link failed' using errcode='42501'; end if;
  return saved;
end $$;
revoke all on function public.save_ai_quotation(uuid,jsonb,uuid) from public,anon;
grant execute on function public.save_ai_quotation(uuid,jsonb,uuid) to authenticated;

-- Recover only unique same-owner matches of the ENTIRE ordered item list:
-- room, product, side, width, height and rate. Ignore calculated area because
-- older saves recomputed it. Require multiple items and a bounded save window.
with project_lines as (
  select p.id,p.user_id,p.created_at,p.updated_at,
    jsonb_agg(jsonb_build_array(s->>'title',i->>'productName',coalesce(i->>'side',''),
      coalesce((i->>'widthFt')::numeric,0),coalesce((i->>'heightFt')::numeric,0),
      coalesce((i->>'ratePerSft')::numeric,0)) order by sidx,iidx) signature
  from public.quotation_plan_projects p
  cross join lateral jsonb_array_elements(p.estimate->'draft'->'sections') with ordinality a(s,sidx)
  cross join lateral jsonb_array_elements(s->'items') with ordinality b(i,iidx)
  where p.quotation_id is null and p.estimate is not null group by p.id
), quote_lines as (
  select q.id,q.user_id,q.created_at,
    jsonb_agg(jsonb_build_array(s.section_name,i.product_name,coalesce(i.side,''),
      coalesce(i.width_ft,0),coalesce(i.height_ft,0),coalesce(i.rate_per_sft,0))
      order by s.sort_order,s.id,i.sort_order,i.id) signature
  from public.quotations q join public.quotation_sections s on s.quotation_id=q.id
  join public.quotation_items i on i.section_id=s.id group by q.id
), matches as (
  select p.id project_id,q.id quotation_id from project_lines p join quote_lines q
  on p.user_id=q.user_id and p.signature=q.signature and jsonb_array_length(p.signature)>=2
  and q.created_at>=p.created_at and q.created_at<=p.updated_at+interval '7 days'
  where not exists(select 1 from public.quotation_plan_projects linked where linked.quotation_id=q.id)
), unique_matches as (
  select * from matches m where (select count(*) from matches x where x.project_id=m.project_id)=1
  and (select count(*) from matches x where x.quotation_id=m.quotation_id)=1
)
update public.quotation_plan_projects p set quotation_id=m.quotation_id
from unique_matches m where p.id=m.project_id and p.quotation_id is null;
notify pgrst, 'reload schema';
commit;
