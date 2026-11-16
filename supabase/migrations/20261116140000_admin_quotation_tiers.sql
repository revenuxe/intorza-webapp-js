begin;
create or replace function public.admin_quotation_directory(p_search text default '', p_page integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare term text:=lower(trim(coalesce(p_search,''))); compact text; total bigint; rows jsonb; matched uuid[];
begin
 if public.is_admin() is distinct from true then raise exception 'Admin access required' using errcode='42501'; end if;
 if length(term)>160 or p_page is null or p_page<0 or p_page>100000 then raise exception 'Invalid quotation search or page' using errcode='22023'; end if;
 compact:=regexp_replace(term,'[^a-z0-9]','','g');
 select coalesce(array_agg(distinct coalesce(q.tier_parent_id,q.id)),'{}'::uuid[]) into matched
 from public.quotations q left join public.profiles p on p.id=q.user_id
 where term='' or strpos(lower(concat_ws(' ',q.reference_no,q.quotation_number,q.client_name,q.quotation_title,q.project_name,q.tier_name,p.email)),term)>0
 or compact<>'' and strpos(regexp_replace(lower(q.reference_no),'[^a-z0-9]','','g'),compact)>0;
 total:=cardinality(matched);
 select coalesce(jsonb_agg(to_jsonb(quote_page) order by quote_page.created_at desc,quote_page.id),'[]'::jsonb) into rows from (
  select q.id,q.quotation_number,q.reference_no,q.client_name,q.quotation_title,q.project_name,q.grand_total,q.status,q.created_at,coalesce(p.email,'Unknown') as user_email,
    (select count(*) from public.quotations t where t.id=q.id or t.tier_parent_id=q.id) as tier_count,
    (select string_agg(t.tier_name,', ' order by (t.id=q.id) desc,t.created_at,t.id) from public.quotations t where t.id=q.id or t.tier_parent_id=q.id) as tier_names
  from public.quotations q left join public.profiles p on p.id=q.user_id
  where q.id=any(matched) and q.tier_parent_id is null
  order by q.created_at desc,q.id offset p_page*50 limit 50
 ) quote_page;
 return jsonb_build_object('rows',rows,'total',total,'page',p_page,'page_size',50);
end $$;

create function public.admin_quotation_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare root_id uuid;
begin
 if public.is_admin() is distinct from true then raise exception 'Admin access required' using errcode='42501'; end if;
 select coalesce(tier_parent_id,id) into root_id from public.quotations where id=p_id;
 if not found then raise exception 'Quotation not found' using errcode='P0002'; end if;
 return jsonb_build_object('root_id',root_id,'user_email',(
   select p.email from public.profiles p join public.quotations q on q.user_id=p.id where q.id=root_id
 ),'tiers',(
   select jsonb_agg(jsonb_build_object('id',q.id,'tier_name',q.tier_name,'reference_no',q.reference_no,
     'quotation_number',q.quotation_number,'status',q.status,'grand_total',q.grand_total,'created_at',q.created_at,
     'version_count',(select count(*) from public.quotation_versions v where v.quotation_id=q.id),
     'snapshot',public.quotation_version_snapshot(q.id)) order by (q.id=root_id) desc,q.created_at,q.id)
   from public.quotations q where q.id=root_id or q.tier_parent_id=root_id
 ));
end $$;
revoke all on function public.admin_quotation_directory(text,integer) from public,anon;
revoke all on function public.admin_quotation_detail(uuid) from public,anon;
grant execute on function public.admin_quotation_directory(text,integer) to authenticated;
grant execute on function public.admin_quotation_detail(uuid) to authenticated;
commit;
