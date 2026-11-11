begin;
create or replace function public.admin_quotation_directory(p_search text default '', p_page integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare term text:=lower(trim(coalesce(p_search,''))); compact text; total bigint; rows jsonb;
begin
 if public.is_admin() is distinct from true then raise exception 'Admin access required' using errcode='42501'; end if;
 if length(term)>160 or p_page is null or p_page<0 or p_page>100000 then raise exception 'Invalid quotation search or page' using errcode='22023'; end if;
 compact:=regexp_replace(term,'[^a-z0-9]','','g');
 select count(*) into total from public.quotations q left join public.profiles p on p.id=q.user_id
 where term='' or strpos(lower(concat_ws(' ',q.reference_no,q.quotation_number,q.client_name,q.quotation_title,q.project_name,p.email)),term)>0
 or compact<>'' and strpos(regexp_replace(lower(q.reference_no),'[^a-z0-9]','','g'),compact)>0;
 select coalesce(jsonb_agg(to_jsonb(quote_page) order by quote_page.created_at desc,quote_page.id),'[]'::jsonb) into rows from (
  select q.id,q.quotation_number,q.reference_no,q.client_name,q.quotation_title,q.project_name,q.grand_total,q.status,q.created_at,coalesce(p.email,'Unknown') as user_email
  from public.quotations q left join public.profiles p on p.id=q.user_id
  where term='' or strpos(lower(concat_ws(' ',q.reference_no,q.quotation_number,q.client_name,q.quotation_title,q.project_name,p.email)),term)>0
  or compact<>'' and strpos(regexp_replace(lower(q.reference_no),'[^a-z0-9]','','g'),compact)>0
  order by q.created_at desc,q.id offset p_page*50 limit 50
 ) quote_page;
 return jsonb_build_object('rows',rows,'total',total,'page',p_page,'page_size',50);
end; $$;
revoke all on function public.admin_quotation_directory(text,integer) from public,anon;
grant execute on function public.admin_quotation_directory(text,integer) to authenticated;
commit;
