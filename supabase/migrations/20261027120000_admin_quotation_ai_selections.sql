begin;
create or replace function public.admin_quotation_ai_selections(p_quotation_ids uuid[])
returns table(quotation_id uuid, brief jsonb, property_type text)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_quotation_ids), 0) > 100 then
    raise exception 'Request at most 100 quotations' using errcode = '22023';
  end if;
  return query
  select distinct on (p.quotation_id) p.quotation_id,
    case when jsonb_typeof(p.analysis->'rooms') = 'array' and jsonb_typeof(p.brief->'roomNames') = 'array'
    then jsonb_set(p.brief, '{roomNames}', coalesce((
      select jsonb_agg(room->'name') from jsonb_array_elements(p.analysis->'rooms') room
      where (p.brief->'roomNames') ? (room->>'name') and (
        p.brief->>'scope' in ('complete','modular','selected') or
        p.brief->>'scope' = 'kitchen' and room->>'kind' = 'kitchen' or
        p.brief->>'scope' = 'bedrooms' and room->>'kind' = 'bedroom' or
        p.brief->>'scope' = 'kitchen-wardrobes' and room->>'kind' in ('kitchen','bedroom') or
        p.brief->>'scope' = 'living-bedrooms' and room->>'kind' in ('living','bedroom')
      )
    ), '[]'::jsonb)) else p.brief end,
    p.analysis->>'propertyType'
  from public.quotation_plan_projects p
  join public.quotations q on q.id = p.quotation_id and q.user_id = p.user_id
  where p.quotation_id = any(p_quotation_ids) and p.estimate is not null
  order by p.quotation_id, p.updated_at desc, p.id desc;
end;
$$;
revoke all on function public.admin_quotation_ai_selections(uuid[]) from public, anon;
grant execute on function public.admin_quotation_ai_selections(uuid[]) to authenticated;
create index if not exists quotation_plan_projects_quotation_updated
on public.quotation_plan_projects(quotation_id, updated_at desc) where quotation_id is not null;
notify pgrst, 'reload schema';
commit;
