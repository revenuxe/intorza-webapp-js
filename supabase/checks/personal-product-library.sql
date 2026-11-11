begin;
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e70901','library-a@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e70902','library-b@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70901',true);
insert into public.library_personal_entries(user_id,entry_id,kind,data,revision)
values(auth.uid(),'test-product','product','{"id":"test-product","rate":1450}','r1');
update public.library_personal_entries set data='{"id":"test-product","rate":1600}',revision='r2' where entry_id='test-product';
do $$ begin
 if not exists(select 1 from public.library_personal_entries where entry_id='test-product' and data->>'rate'='1600') then raise exception 'Own library update failed'; end if;
 begin
  insert into public.library_personal_entries(user_id,entry_id,kind,data,revision) values('b10d372e-09ae-4f18-9b5d-711416e70902','forged','product','{"id":"forged"}','r');
  raise exception 'Cross-account insert allowed';
 exception when insufficient_privilege then null; end;
end; $$;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e70902',true);
do $$ declare count_rows integer; begin
 if exists(select 1 from public.library_personal_entries where entry_id='test-product') then raise exception 'Private prices leaked'; end if;
 update public.library_personal_entries set revision='stolen' where entry_id='test-product';
 get diagnostics count_rows=row_count;
 if count_rows<>0 then raise exception 'Cross-account update allowed'; end if;
end; $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.library_personal_entries; raise exception 'Anonymous private library read allowed';
 exception when insufficient_privilege then null; end;
end; $$;
reset role;
rollback;
select 'PASS: non-Pro personal saves, own updates, cross-account read/write isolation, anonymous private data blocked; synthetic records rolled back' as result;
