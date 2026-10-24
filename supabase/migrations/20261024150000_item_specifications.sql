begin;
alter table public.quotation_items add column if not exists specifications jsonb not null default '[]'::jsonb;

create or replace function public.valid_item_specifications(p_value jsonb)
returns boolean language plpgsql immutable set search_path=public,pg_temp as $$
declare entry jsonb; labels text[] := '{}'; label text;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'array' then return false; end if;
  if jsonb_array_length(p_value) > 20 then return false; end if;
  for entry in select value from jsonb_array_elements(p_value) loop
    if jsonb_typeof(entry) <> 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(entry)) <> 2 or not (entry ? 'label' and entry ? 'value') then return false; end if;
    if jsonb_typeof(entry->'label') <> 'string' or jsonb_typeof(entry->'value') <> 'string' then return false; end if;
    label := btrim(entry->>'label');
    if length(label) not between 1 and 40 or label ~ E'[:\\r\\n]' or length(btrim(entry->>'value')) not between 1 and 160 or (entry->>'value') ~ E'[\\r\\n]' then return false; end if;
    if lower(label) = any(labels) then return false; end if;
    labels := array_append(labels,lower(label));
  end loop;
  return true;
end $$;

-- Recognize only a complete, valid legacy suffix; ambiguous text is preserved.
create or replace function public.split_item_specifications(p_details text)
returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare parts text[]; line text; pair text[]; description text; rows jsonb := '[]'; content text;
begin
  p_details := coalesce(p_details,'');
  parts := regexp_match(p_details,E'^(.*)\\n\\nSpecifications:\\n(.*)$','s');
  if parts is not null then description := parts[1]; content := parts[2];
  elsif left(p_details,length(E'Specifications:\n')) = E'Specifications:\n' then description := ''; content := substring(p_details from length(E'Specifications:\n')+1);
  else return jsonb_build_object('description',p_details,'specifications','[]'::jsonb); end if;
  foreach line in array string_to_array(content,E'\n') loop
    pair := regexp_match(line,E'^([^:\\r\\n]{1,40}): (.+)$');
    if pair is null then return jsonb_build_object('description',p_details,'specifications','[]'::jsonb); end if;
    rows := rows || jsonb_build_array(jsonb_build_object('label',btrim(pair[1]),'value',btrim(pair[2])));
  end loop;
  if jsonb_array_length(rows) = 0 or not public.valid_item_specifications(rows) then return jsonb_build_object('description',p_details,'specifications','[]'::jsonb); end if;
  return jsonb_build_object('description',description,'specifications',rows);
end $$;

-- Keep readable details compatible with older browser tabs and PDF clients.
-- The structured column is validated and synchronized on every direct/RPC write.
create or replace function public.format_item_specifications(p_description text,p_specs jsonb)
returns text language sql immutable set search_path=public,pg_temp as $$
  select case when jsonb_array_length(p_specs)=0 then coalesce(p_description,'')
    else case when btrim(coalesce(p_description,''))='' then '' else rtrim(p_description)||E'\n\n' end || E'Specifications:\n' ||
      (select string_agg(btrim(value->>'label')||': '||btrim(value->>'value'),E'\n' order by ord) from jsonb_array_elements(p_specs) with ordinality as rows(value,ord)) end;
$$;
create or replace function public.sync_item_specifications()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare parsed jsonb;
begin
  parsed := public.split_item_specifications(new.product_details);
  if tg_op='INSERT' then
    if new.specifications='[]'::jsonb and jsonb_array_length(parsed->'specifications')>0 then new.specifications:=parsed->'specifications'; end if;
  elsif new.specifications is not distinct from old.specifications and jsonb_array_length(parsed->'specifications')>0 then
    new.specifications:=parsed->'specifications';
  end if;
  if not public.valid_item_specifications(new.specifications) then raise exception 'Invalid item specifications'; end if;
  new.product_details:=public.format_item_specifications(parsed->>'description',new.specifications);
  return new;
end $$;
create trigger quotation_items_sync_specifications before insert or update of product_details,specifications on public.quotation_items
for each row execute function public.sync_item_specifications();

alter table public.quotation_items add constraint quotation_items_specifications_check check(public.valid_item_specifications(specifications));
update public.quotation_items set specifications = public.split_item_specifications(product_details)->'specifications'
where specifications = '[]'::jsonb and jsonb_array_length(public.split_item_specifications(product_details)->'specifications') > 0;

create or replace function public.save_quotation(p_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_quote public.quotations;
  v_section jsonb;
  v_item jsonb;
  v_section_id uuid;
  v_item_id uuid;
  v_sections uuid[] := '{}';
  v_items uuid[];
  v_order integer := 0;
  v_item_order integer;
  v_details jsonb;
  v_specs jsonb;
  v_image jsonb;
  v_image_order integer;
begin
  if v_user is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid quotation payload'; end if;
  if p_id is not null then
    select * into v_quote from public.quotations where id = p_id and user_id = v_user for update;
    if not found then raise exception 'Quotation not found or access denied' using errcode = '42501'; end if;
  else
    v_quote.id := gen_random_uuid();
    v_quote.user_id := v_user;
    v_quote.created_at := now();
    v_quote.status := 'pending';
    v_quote.subtotal := 0; v_quote.grand_total := 0;
    v_quote.gst_enabled := false; v_quote.gst_percentage := 0;
    v_quote.gst_amount := 0; v_quote.discount_amount := 0;
  end if;
  v_quote := jsonb_populate_record(v_quote, p_payload - array['id','user_id','created_at','updated_at','sections']);
  v_quote.updated_at := now();
  if p_id is null then
    insert into public.quotations select (v_quote).*;
  else
    update public.quotations set
      client_id = v_quote.client_id, quotation_number = v_quote.quotation_number,
      project_name = v_quote.project_name, quotation_title = v_quote.quotation_title,
      client_name = v_quote.client_name, client_address = v_quote.client_address,
      place_of_project = v_quote.place_of_project, date_of_proposal = v_quote.date_of_proposal,
      valid_till = v_quote.valid_till, project_deadline = v_quote.project_deadline,
      warranty = v_quote.warranty, project_type = v_quote.project_type,
      subtotal = v_quote.subtotal, gst_enabled = v_quote.gst_enabled,
      gst_percentage = v_quote.gst_percentage, gst_amount = v_quote.gst_amount,
      discount_amount = v_quote.discount_amount, grand_total = v_quote.grand_total,
      status = v_quote.status, notes = v_quote.notes, updated_at = now()
    where id = v_quote.id and user_id = v_user;
  end if;
  if p_payload ? 'sections' then
    if jsonb_typeof(p_payload->'sections') is distinct from 'array' then raise exception 'Sections must be an array'; end if;
    for v_section in select value from jsonb_array_elements(p_payload->'sections') loop
      v_section_id := null;
      if coalesce(v_section->>'id','') ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
        select id into v_section_id from public.quotation_sections
        where id = (v_section->>'id')::uuid and quotation_id = v_quote.id;
      end if;
      if v_section_id is null then
        insert into public.quotation_sections(quotation_id, section_name, sort_order)
        values(v_quote.id, coalesce(v_section->>'section_name', 'Section'), v_order) returning id into v_section_id;
      else
        update public.quotation_sections set section_name = coalesce(v_section->>'section_name', 'Section'), sort_order = v_order where id = v_section_id;
      end if;
      v_sections := array_append(v_sections, v_section_id);
      v_items := '{}'; v_item_order := 0;
      if jsonb_typeof(v_section->'items') is distinct from 'array' then raise exception 'Items must be an array'; end if;
      for v_item in select value from jsonb_array_elements(v_section->'items') loop
        v_item_id := null;
        if coalesce(v_item->>'id','') ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
          select id into v_item_id from public.quotation_items where id = (v_item->>'id')::uuid and section_id = v_section_id;
        end if;
        if v_item_id is null then v_item_id := gen_random_uuid(); end if;
        v_details := public.split_item_specifications(v_item->>'product_details');
        if v_item ? 'specifications' then
          v_specs := v_item->'specifications';
        else
          v_specs := v_details->'specifications';
          if v_specs = '[]'::jsonb then
            select coalesce(specifications,'[]'::jsonb) into v_specs from public.quotation_items where id=v_item_id and section_id=v_section_id;
            v_specs := coalesce(v_specs,'[]'::jsonb);
          end if;
        end if;
        if not public.valid_item_specifications(v_specs) then raise exception 'Invalid item specifications'; end if;
        insert into public.quotation_items(id, section_id, product_name, product_details, specifications, side, measurement_unit, width_ft, height_ft, sft_area, rate_per_sft, amount, sort_order)
        values(v_item_id, v_section_id, coalesce(v_item->>'product_name',''), public.format_item_specifications(v_details->>'description',v_specs), v_specs, v_item->>'side',
          coalesce(v_item->>'measurement_unit','Sq.ft'), coalesce((v_item->>'width_ft')::numeric,0), coalesce((v_item->>'height_ft')::numeric,0), coalesce((v_item->>'sft_area')::numeric,0),
          coalesce((v_item->>'rate_per_sft')::numeric,0), coalesce((v_item->>'amount')::numeric,0), v_item_order)
        on conflict (id) do update set product_name = excluded.product_name, product_details = excluded.product_details, specifications = excluded.specifications,
          side = excluded.side, width_ft = excluded.width_ft, height_ft = excluded.height_ft,
          measurement_unit = excluded.measurement_unit, sft_area = excluded.sft_area, rate_per_sft = excluded.rate_per_sft, amount = excluded.amount, sort_order = excluded.sort_order;
        if v_item ? 'gallery_image_ids' then
          if jsonb_typeof(v_item->'gallery_image_ids') is distinct from 'array' then raise exception 'Image references must be an array'; end if;
          delete from public.quotation_item_images where quotation_item_id = v_item_id;
          v_image_order := 0;
          for v_image in select value from jsonb_array_elements(v_item->'gallery_image_ids') loop
            if not exists(select 1 from public.gallery_images where id = (v_image #>> '{}')::uuid and user_id = v_user) then
              raise exception 'Gallery image not found or access denied' using errcode = '42501';
            end if;
            insert into public.quotation_item_images(quotation_item_id, gallery_image_id, sort_order)
            values(v_item_id, (v_image #>> '{}')::uuid, v_image_order);
            v_image_order := v_image_order + 1;
          end loop;
        end if;
        v_items := array_append(v_items, v_item_id); v_item_order := v_item_order + 1;
      end loop;
      delete from public.quotation_items where section_id = v_section_id and not(id = any(v_items));
      v_order := v_order + 1;
    end loop;
    delete from public.quotation_sections where quotation_id = v_quote.id and not(id = any(v_sections));
  end if;
  return to_jsonb(v_quote);
end;
$$;
revoke all on function public.save_quotation(uuid,jsonb) from public, anon;
grant execute on function public.save_quotation(uuid,jsonb) to authenticated;
commit;
