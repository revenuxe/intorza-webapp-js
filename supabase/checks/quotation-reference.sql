begin;
insert into auth.users(id,email,raw_user_meta_data) values('b10d372e-09ae-4f18-9b5d-711416e70701','quotation-reference@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70701',true);
do $$ declare a jsonb; b jsonb; ref text; begin
 a:=public.save_quotation(null,'{"quotation_number":"TEST-QNO-A","client_name":"Synthetic client","project_name":"Synthetic project","status":"draft","sections":[],"reference_no":"QNO-FORGED"}'::jsonb);
 select reference_no into ref from public.quotations where id=(a->>'id')::uuid;
 if ref is null or ref !~ '^QNO-[0-9A-Z]{6}$' or ref='QNO-FORGED' then raise exception 'Server reference generation failed'; end if;
 b:=public.save_quotation(null,'{"quotation_number":"TEST-QNO-B","client_name":"Synthetic client","project_name":"Copy","status":"draft","sections":[]}'::jsonb);
 if (select reference_no from public.quotations where id=(b->>'id')::uuid)=ref then raise exception 'Duplicate reference generated'; end if;
 perform public.save_quotation((a->>'id')::uuid,'{"status":"draft","reference_no":"QNO-FORGED","project_name":"Edited"}'::jsonb);
 if (select reference_no from public.quotations where id=(a->>'id')::uuid)<>ref then raise exception 'Edit changed reference'; end if;
 update public.quotations set reference_no='QNO-FORGED' where id=(a->>'id')::uuid;
 if (select reference_no from public.quotations where id=(a->>'id')::uuid)<>ref then raise exception 'Direct edit changed reference'; end if;
end; $$;
reset role;
rollback;
select 'PASS: new and copied quotations receive unique short references; supplied references ignored; references survive edits; synthetic records rolled back' as result;
