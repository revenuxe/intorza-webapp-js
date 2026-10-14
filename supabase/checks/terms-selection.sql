begin;
insert into auth.users(id,email,raw_user_meta_data) values
('f14e93d0-bf5e-4b62-b102-f39a21494e01','terms-check@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494e01',true);
do $$
declare a uuid; b uuid; i uuid; denied boolean := false;
begin
  insert into public.terms_templates(user_id,template_name,template_type,content,is_default,is_enabled)
  values(auth.uid(),'Previous','quotation','[{"id":"1","title":"Previous","points":["Old"]}]',true,true) returning id into a;
  insert into public.terms_templates(user_id,template_name,template_type,content,is_default,is_enabled)
  values(auth.uid(),'Selected','quotation','[{"id":"1","title":"Custom terms","points":["Selected payment schedule"]}]',false,false) returning id into b;
  insert into public.terms_templates(user_id,template_name,template_type,content,is_default,is_enabled)
  values(auth.uid(),'Invoice','invoice','[{"id":"1","title":"Invoice","points":["Pay"]}]',true,true) returning id into i;
  perform public.select_terms_template(b);
  if not exists(select 1 from public.terms_templates where id=b and is_default and is_enabled) then raise exception 'Selection did not enable template'; end if;
  if exists(select 1 from public.terms_templates where id=a and is_default) then raise exception 'Previous default remained selected'; end if;
  if not exists(select 1 from public.terms_templates where id=i and is_default) then raise exception 'Invoice selection changed'; end if;
  perform set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494e02',true);
  begin perform public.select_terms_template(b); exception when others then denied := true; end;
  if not denied then raise exception 'Cross-tenant selection was allowed'; end if;
end;
$$;
select 'PASS: selected template enabled, prior default cleared, invoice isolated, cross-tenant denied' as result;
rollback;
