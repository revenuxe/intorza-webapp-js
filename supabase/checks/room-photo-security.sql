-- Synthetic metadata only. Run inside the same rollback-only transaction.
-- Match the Storage API's scoped delete setting for synthetic metadata tests.
-- Only explicitly named synthetic objects are targeted; all changes roll back.
select set_config('storage.allow_delete_query','true',true);
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e50103','security-worker@example.invalid','{}');
insert into public.team_members(id,company_id,user_id,name,email) values
('b10d372e-09ae-4f18-9b5d-711416e50201','b10d372e-09ae-4f18-9b5d-711416e50101','b10d372e-09ae-4f18-9b5d-711416e50103','Synthetic worker','security-worker@example.invalid');
insert into public.site_measurement_projects(id,user_id,client_name,assigned_to) values
('b10d372e-09ae-4f18-9b5d-711416e50301','b10d372e-09ae-4f18-9b5d-711416e50101','Synthetic client','b10d372e-09ae-4f18-9b5d-711416e50201');
insert into public.site_measurement_rooms(id,project_id,room_type) values
('b10d372e-09ae-4f18-9b5d-711416e50401','b10d372e-09ae-4f18-9b5d-711416e50301','Kitchen');
insert into storage.objects(bucket_id,name) values
('room-photos','b10d372e-09ae-4f18-9b5d-711416e50101/rooms/security-check.webp'),
('room-photos','b10d372e-09ae-4f18-9b5d-711416e50102/rooms/security-check.webp'),
('room-photos','legacy-security-check.webp');
insert into public.room_photos(room_id,photo_url) values
('b10d372e-09ae-4f18-9b5d-711416e50401','b10d372e-09ae-4f18-9b5d-711416e50101/rooms/security-check.webp'),
('b10d372e-09ae-4f18-9b5d-711416e50401','https://example.invalid/storage/v1/object/sign/room-photos/legacy-security-check.webp?token=synthetic');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  if exists(select 1 from storage.objects where bucket_id='room-photos' and name like '%security-check.webp') then
    raise exception 'Anonymous room object read allowed';
  end if;
end; $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e50102',true);
do $$ declare affected integer; denied boolean := false; begin
  if exists(select 1 from storage.objects where bucket_id='room-photos' and name='b10d372e-09ae-4f18-9b5d-711416e50101/rooms/security-check.webp') then
    raise exception 'Cross-tenant object read allowed';
  end if;
  delete from storage.objects where bucket_id='room-photos' and name='b10d372e-09ae-4f18-9b5d-711416e50101/rooms/security-check.webp';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-tenant deletion allowed'; end if;
  begin insert into storage.objects(bucket_id,name) values('room-photos','b10d372e-09ae-4f18-9b5d-711416e50101/rooms/forbidden.webp');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Foreign-prefix upload allowed'; end if;
end; $$;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e50101',true);
do $$ declare denied boolean := false; begin
  if not exists(select 1 from storage.objects where bucket_id='room-photos' and name='legacy-security-check.webp') then
    raise exception 'Owner legacy photo access broken';
  end if;
  begin insert into public.room_photos(room_id,photo_url) values('b10d372e-09ae-4f18-9b5d-711416e50401','b10d372e-09ae-4f18-9b5d-711416e50102/rooms/security-check.webp');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Foreign-object reference forgery allowed'; end if;
end; $$;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e50103',true);
do $$ begin
  if not exists(select 1 from storage.objects where bucket_id='room-photos' and name='b10d372e-09ae-4f18-9b5d-711416e50101/rooms/security-check.webp') then
    raise exception 'Assigned worker cannot read project photo';
  end if;
  insert into storage.objects(bucket_id,name) values('room-photos','b10d372e-09ae-4f18-9b5d-711416e50103/rooms/security-check.webp');
  insert into public.room_photos(room_id,photo_url) values('b10d372e-09ae-4f18-9b5d-711416e50401','b10d372e-09ae-4f18-9b5d-711416e50103/rooms/security-check.webp');
end; $$;
reset role;
select 'PASS: anonymous/foreign photo denial, owner legacy access, assigned-worker read/upload, forged-reference denial' as result;
