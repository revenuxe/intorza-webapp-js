-- Synthetic fixtures only; all changes roll back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('a2712000-0000-4000-8000-000000000001','ai-admin@example.invalid','{}'),
('a2712000-0000-4000-8000-000000000002','ai-owner@example.invalid','{}');
insert into public.user_roles(user_id,role) values('a2712000-0000-4000-8000-000000000001','admin');
insert into public.quotations(id,user_id,quotation_number,client_name,project_name,status) values
('a2712000-0000-4000-8000-000000000003','a2712000-0000-4000-8000-000000000002','AI-CHECK','Synthetic','Synthetic','draft'),
('a2712000-0000-4000-8000-000000000004','a2712000-0000-4000-8000-000000000002','MANUAL-CHECK','Synthetic','Synthetic','draft');
insert into public.quotation_plan_projects(user_id,quotation_id,analysis,brief,estimate) values
('a2712000-0000-4000-8000-000000000002','a2712000-0000-4000-8000-000000000003','{"propertyType":"2 BHK"}','{"scope":"complete","roomNames":["Kitchen"]}','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','a2712000-0000-4000-8000-000000000002',true);
do $$ begin
  begin
    perform public.admin_quotation_ai_selections(array['a2712000-0000-4000-8000-000000000003']::uuid[]);
    raise exception 'Customer accessed admin AI choices';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a2712000-0000-4000-8000-000000000001',true);
do $$ declare result record; total integer; begin
  select count(*) into total from public.admin_quotation_ai_selections(array['a2712000-0000-4000-8000-000000000003','a2712000-0000-4000-8000-000000000004']::uuid[]);
  if total <> 1 then raise exception 'Manual quote incorrectly labelled AI'; end if;
  select * into result from public.admin_quotation_ai_selections(array['a2712000-0000-4000-8000-000000000003']::uuid[]);
  if result.brief->>'scope' <> 'complete' or result.property_type <> '2 BHK' then raise exception 'Saved selections missing'; end if;
  begin
    perform public.admin_quotation_ai_selections(array_fill('a2712000-0000-4000-8000-000000000003'::uuid,array[101]));
    raise exception 'Unbounded admin request accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.quotation_plan_projects set
  analysis='{"propertyType":"2 BHK","rooms":[{"name":"Kitchen","kind":"kitchen"},{"name":"Bedroom","kind":"bedroom"}]}',
  brief='{"scope":"kitchen","roomNames":["Kitchen","Bedroom"]}'
where quotation_id='a2712000-0000-4000-8000-000000000003';
set local role authenticated;
do $$ declare choices jsonb; begin
  select brief into choices from public.admin_quotation_ai_selections(array['a2712000-0000-4000-8000-000000000003']::uuid[]);
  if choices->'roomNames' <> '["Kitchen"]'::jsonb then raise exception 'Rooms outside selected scope included'; end if;
end $$;
reset role;
delete from public.user_roles where user_id='a2712000-0000-4000-8000-000000000001' and role='admin';
set local role authenticated;
do $$ begin
  begin
    perform public.admin_quotation_ai_selections('{}'::uuid[]);
    raise exception 'Revoked admin accessed AI choices';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: admin selections, manual exclusion, request bounds, customer and revoked-admin denial' as result;
rollback;
