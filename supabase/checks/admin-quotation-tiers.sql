-- Synthetic records only; rollback leaves customer data unchanged.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('f14e93d0-bf5e-4b62-b102-f39a21494d41','admin-tier-owner@example.invalid','{"full_name":"Owner check"}'),
 ('f14e93d0-bf5e-4b62-b102-f39a21494d42','admin-tier-admin@example.invalid','{"full_name":"Admin check"}'),
 ('f14e93d0-bf5e-4b62-b102-f39a21494d43','admin-tier-other@example.invalid','{"full_name":"Other check"}');
insert into public.profiles(id,email) values('f14e93d0-bf5e-4b62-b102-f39a21494d41','admin-tier-owner@example.invalid') on conflict(id) do update set email=excluded.email;
insert into public.user_roles(user_id,role) values('f14e93d0-bf5e-4b62-b102-f39a21494d42','admin') on conflict(user_id,role) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d41',true);
do $$
declare root jsonb; child jsonb; result jsonb; root_id uuid; child_id uuid; failed boolean;
begin
 root:=public.save_quotation(null,'{"quotation_number":"ADMIN-TIER-CHECK","project_name":"Admin tier inspection","client_name":"Synthetic admin tier client","grand_total":100,"status":"draft","sections":[{"section_name":"Bedroom","items":[{"product_name":"Wardrobe","amount":100}]}]}');
 root_id:=(root->>'id')::uuid;
 perform public.name_quotation_tier(root_id,'Standard');
 child:=public.create_quotation_tier(root_id,'Luxury-Audit-Unique'); child_id:=(child->>'id')::uuid;
 perform public.save_quotation(child_id,'{"grand_total":300,"sections":[{"section_name":"Bedroom","items":[{"product_name":"Oak wardrobe","amount":300}]}]}');
 failed:=false;
 begin perform public.admin_quotation_detail(root_id); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'Non-admin owner can access admin detail'; end if;
 failed:=false;
 begin perform public.admin_quotation_directory('',0); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'Non-admin can access admin directory'; end if;
 perform set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d42',true);
 result:=public.admin_quotation_directory('Luxury-Audit-Unique',0);
 if (result->>'total')::integer<>1 or result#>>'{rows,0,id}'<>root_id::text or (result#>>'{rows,0,tier_count}')::integer<>2 then raise exception 'Child tier search must show a single root with both options'; end if;
 result:=public.admin_quotation_directory('ADMIN-TIER-CHECK',0);
 if (result->>'total')::integer<>1 then raise exception 'Root search duplicated tiers'; end if;
 result:=public.admin_quotation_detail(child_id);
 if result->>'root_id'<>root_id::text or jsonb_array_length(result->'tiers')<>2 then raise exception 'Admin child detail did not resolve group'; end if;
 if result#>>'{tiers,0,snapshot,sections,0,items,0,product_name}'<>'Wardrobe' or result#>>'{tiers,1,snapshot,sections,0,items,0,product_name}'<>'Oak wardrobe' then raise exception 'Wrong tier contents'; end if;
 if (result#>>'{tiers,0,grand_total}')::numeric<>100 or (result#>>'{tiers,1,grand_total}')::numeric<>300 then raise exception 'Wrong tier totals'; end if;
 if (result#>>'{tiers,1,version_count}')::integer<>2 then raise exception 'Wrong tier history count'; end if;
 failed:=false;
 begin perform public.admin_quotation_directory('',-1); exception when invalid_parameter_value then failed:=true; end;
 if not failed then raise exception 'Invalid pagination should fail'; end if;
 perform set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d43',true);
 failed:=false;
 begin perform public.admin_quotation_detail(child_id); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'Non-admin other account can inspect a tier'; end if;
end $$;
select 'PASS: grouped directory, child-tier search, admin cross-account detail, independent tier contents and non-admin denial' as result;
rollback;
