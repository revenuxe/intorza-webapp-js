begin;
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e71001','admin-quote-check@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e71002','quote-search-owner@example.invalid','{}');
insert into public.user_roles(user_id,role) values('b10d372e-09ae-4f18-9b5d-711416e71001','admin');
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e71002',true);
select public.save_quotation(null,'{"quotation_number":"ADMIN-SEARCH-TEST","client_name":"Synthetic_admin_quote_client","project_name":"Synthetic_admin_quote_project","quotation_title":"Synthetic_admin_quote_title","status":"draft","sections":[]}'::jsonb);
do $$ begin
 begin perform public.admin_quotation_directory('',0); raise exception 'Non-admin access allowed'; exception when insufficient_privilege then null; end;
end; $$;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e71001',true);
do $$ declare result jsonb; target uuid; reference text; total bigint; begin
 select count(*) into total from public.quotations;
 result:=public.admin_quotation_directory('',0);
 if (result->>'total')::bigint<>total or jsonb_array_length(result->'rows')<>least(total,50) then raise exception 'Full history count or pagination failed'; end if;
 select id,reference_no into target,reference from public.quotations order by created_at asc limit 1;
 result:=public.admin_quotation_directory(lower(replace(reference,'-','')),0);
 if not exists(select 1 from jsonb_array_elements(result->'rows') row where row->>'id'=target::text and row->>'reference_no'=reference) then raise exception 'Old quotation reference search failed'; end if;
 if (public.admin_quotation_directory('SYNTHETIC_ADMIN_QUOTE_CLIENT',0)->>'total')::integer<>1 then raise exception 'Client search failed'; end if;
 if (public.admin_quotation_directory('Synthetic_admin_quote_project',0)->>'total')::integer<>1 then raise exception 'Project search failed'; end if;
 if (public.admin_quotation_directory('Synthetic_admin_quote_title',0)->>'total')::integer<>1 then raise exception 'Title search failed'; end if;
 if (public.admin_quotation_directory('quote-search-owner@example.invalid',0)->>'total')::integer<>1 then raise exception 'Email search failed'; end if;
 if (public.admin_quotation_directory('ADMIN-SEARCH-TEST',0)->>'total')::integer<>1 then raise exception 'Quote number search failed'; end if;
 if jsonb_array_length(public.admin_quotation_directory('',1)->'rows')<>least(greatest(total-50,0),50) then raise exception 'Second page failed'; end if;
 begin perform public.admin_quotation_directory('',-1); raise exception 'Invalid page accepted'; exception when invalid_parameter_value then null; end;
end; $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.admin_quotation_directory('',0); raise exception 'Anonymous access allowed'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
rollback;
select 'PASS: admin-only full-history pagination; reference/name/title/email/quote searches; non-admin and anonymous denied; synthetic records rolled back' as result;
