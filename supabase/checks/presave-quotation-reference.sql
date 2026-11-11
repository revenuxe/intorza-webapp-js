begin;
set local role anon;
select public.reserve_quotation_reference() as first_reference;
select public.reserve_quotation_reference() as second_reference;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('b10d372e-09ae-4f18-9b5d-711416e70801','presave-reference@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70801',true);
do $$ declare ref text; a jsonb; begin
 ref:=public.reserve_quotation_reference();
 a:=public.save_quotation(null,jsonb_build_object('reference_no',ref,'quotation_number','PRESAVE-TEST','client_name','Synthetic','project_name','Synthetic','status','draft','sections','[]'::jsonb));
 if (select reference_no from public.quotations where id=(a->>'id')::uuid)<>ref then raise exception 'Reserved reference changed on save'; end if;
 perform public.save_quotation((a->>'id')::uuid,jsonb_build_object('reference_no','QNO-XXXXXX','status','draft'));
 if (select reference_no from public.quotations where id=(a->>'id')::uuid)<>ref then raise exception 'Reference changed on edit'; end if;
 begin
  perform public.save_quotation(null,jsonb_build_object('reference_no',ref,'quotation_number','PRESAVE-DUP','client_name','Synthetic','project_name','Synthetic','status','draft','sections','[]'::jsonb));
  raise exception 'Duplicate reference accepted';
 exception when unique_violation then null; end;
end; $$;
reset role;
rollback;
select 'PASS: anonymous reservation works; saved reference preserved; edits immutable; duplicates rejected; test records rolled back' as result;
