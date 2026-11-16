begin;

create table public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  saved_at timestamptz not null default now(),
  snapshot jsonb not null,
  unique (quotation_id, version_number)
);
alter table public.quotation_versions enable row level security;
revoke all on public.quotation_versions from public, anon, authenticated;
grant select on public.quotation_versions to authenticated;
create policy "Owners can read quotation versions" on public.quotation_versions
for select to authenticated using (exists (
  select 1 from public.quotations q where q.id = quotation_id and q.user_id = auth.uid()
));

-- Only server-built snapshots are accepted. Never trust a browser's history.
create function public.quotation_version_snapshot(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select (to_jsonb(q) - array['id','user_id','created_at','updated_at','reference_no']) ||
    jsonb_build_object('sections', coalesce((
      select jsonb_agg(
        (to_jsonb(s) - array['quotation_id','created_at']) || jsonb_build_object('items', coalesce((
          select jsonb_agg(
            (to_jsonb(i) - array['section_id','created_at']) || jsonb_build_object('gallery_image_ids', coalesce((
              select jsonb_agg(im.gallery_image_id order by im.sort_order, im.id)
              from public.quotation_item_images im where im.quotation_item_id = i.id
            ), '[]'::jsonb)) order by i.sort_order, i.id)
          from public.quotation_items i where i.section_id = s.id
        ), '[]'::jsonb)) order by s.sort_order, s.id)
      from public.quotation_sections s where s.quotation_id = q.id
    ), '[]'::jsonb))
  from public.quotations q where q.id = p_id;
$$;
revoke all on function public.quotation_version_snapshot(uuid) from public, anon, authenticated;

create function public.record_quotation_version(p_id uuid, p_baseline_only boolean default false)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_number integer;
begin
  perform 1 from public.quotations where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Quotation not found or access denied' using errcode = '42501'; end if;
  select coalesce(max(version_number), 0) into v_number from public.quotation_versions where quotation_id = p_id;
  if p_baseline_only and v_number > 0 then return; end if;
  insert into public.quotation_versions(quotation_id, version_number, snapshot)
  values (p_id, v_number + 1, public.quotation_version_snapshot(p_id));
end;
$$;
revoke all on function public.record_quotation_version(uuid,boolean) from public, anon;
grant execute on function public.record_quotation_version(uuid,boolean) to authenticated;

-- Preserve the existing save implementation and its RLS, validation and AI path.
-- Both snapshots are in the same transaction as the nested save.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.save_quotation(uuid,jsonb)'::regprocedure);
  if position('  if p_id is not null then' in definition) = 0
    or position('  return to_jsonb(v_quote);' in definition) = 0 then
    raise exception 'Unexpected save_quotation definition; version hooks were not installed';
  end if;
  definition := replace(definition, '  if p_id is not null then',
    '  if p_id is not null then perform public.record_quotation_version(p_id, true); end if;
  if p_id is not null then');
  definition := replace(definition, '  return to_jsonb(v_quote);',
    '  perform public.record_quotation_version(v_quote.id);
  return to_jsonb(v_quote);');
  -- Include legacy optional item fields when saving/restoring full snapshots.
  definition := replace(definition, 'specifications, side, measurement_unit, width_ft', 'specifications, side, depth, notes, measurement_unit, width_ft');
  definition := replace(definition, 'v_specs, v_item->>''side'',', 'v_specs, v_item->>''side'', v_item->>''depth'', v_item->>''notes'',');
  definition := replace(definition, 'side = excluded.side, width_ft', 'side = excluded.side,
          depth = case when v_item ? ''depth'' then excluded.depth else quotation_items.depth end,
          notes = case when v_item ? ''notes'' then excluded.notes else quotation_items.notes end, width_ft');
  execute definition;
end;
$$;

-- Existing records get a baseline; edits made before this migration cannot be recovered.
insert into public.quotation_versions(quotation_id, version_number, saved_at, snapshot)
select id, 1, now(), public.quotation_version_snapshot(id) from public.quotations;

create function public.revert_quotation_version(p_id uuid, p_version_id uuid, p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_snapshot jsonb; v_latest integer;
begin
  perform 1 from public.quotations where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Quotation not found or access denied' using errcode = '42501'; end if;
  select max(version_number) into v_latest from public.quotation_versions where quotation_id = p_id;
  if v_latest is distinct from p_expected_version then
    raise exception 'Quotation has changed. Refresh versions before reverting.' using errcode = '40001';
  end if;
  select snapshot into v_snapshot from public.quotation_versions where id = p_version_id and quotation_id = p_id;
  if not found then raise exception 'Version not found or access denied' using errcode = '42501'; end if;
  -- The normal atomic save records the restored state as a new version.
  return public.save_quotation(p_id, v_snapshot);
end;
$$;
revoke all on function public.revert_quotation_version(uuid,uuid,integer) from public, anon;
grant execute on function public.revert_quotation_version(uuid,uuid,integer) to authenticated;

commit;
