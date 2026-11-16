-- Run in an isolated test database: the temporary constraint deliberately makes
-- this synthetic template fail. The complete experiment rolls back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('f14e93d0-bf5e-4b62-b102-f39a21494d63','job-retry@example.invalid','{"full_name":"Retry check"}');
alter table public.quotation_templates add constraint synthetic_template_failure check(template_name<>'Synthetic retry check') not valid;
set local role authenticated;
select set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d63',true);
do $$
declare saved jsonb; result jsonb;
begin
 saved:=public.save_quotation_checked(null,'{"quotation_number":"RETRY-CHECK","quotation_title":"Synthetic retry check","project_name":"Retry check","client_name":"Synthetic","status":"draft","sections":[]}',gen_random_uuid(),null);
 result:=public.process_quotation_jobs(5);
 if result->>'failed'<>'1' or result->>'processed'<>'0' then raise exception 'Expected optional job failure: %',result; end if;
 if not exists(select 1 from public.quotations where id=(saved->>'id')::uuid) or not exists(select 1 from public.quotation_versions where quotation_id=(saved->>'id')::uuid) then raise exception 'Optional failure lost the saved quotation/history'; end if;
 if not exists(select 1 from public.quotation_post_save_jobs where quotation_id=(saved->>'id')::uuid and attempts=1 and next_attempt_at>now() and last_error='23514') then raise exception 'Failed job was not retained with backoff'; end if;
end $$;
reset role;
alter table public.quotation_templates drop constraint synthetic_template_failure;
update public.quotation_post_save_jobs set next_attempt_at=now() where user_id='f14e93d0-bf5e-4b62-b102-f39a21494d63';
set local role authenticated;
do $$
declare result jsonb;
begin
 result:=public.process_quotation_jobs(5);
 if result->>'processed'<>'1' or result->>'failed'<>'0' or exists(select 1 from public.quotation_post_save_jobs) then raise exception 'Retry did not recover: %',result; end if;
 if not exists(select 1 from public.quotation_templates where template_name='Synthetic retry check') then raise exception 'Retried template missing'; end if;
end $$;
select 'PASS: optional template failure preserves quotation/history, persists retry with backoff, and recovers without duplicating the save' as result;
rollback;
