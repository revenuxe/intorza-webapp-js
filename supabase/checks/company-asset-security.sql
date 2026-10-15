-- Run inside a transaction after the migration; fixtures are rolled back.
select set_config('storage.allow_delete_query', 'true', true);
do $$ begin
  if exists(select 1 from storage.buckets where id = 'company-logos' and public) then
    raise exception 'Company assets bucket remains public';
  end if;
end $$;
insert into storage.objects(bucket_id,name) values
('company-logos','b10d372e-09ae-4f18-9b5d-711416e50101/security-check.png'),
('company-logos','b10d372e-09ae-4f18-9b5d-711416e50102/security-check.png');
set local role anon;
do $$ begin
  if exists(select 1 from storage.objects where bucket_id='company-logos') then
    raise exception 'Anonymous enumeration allowed';
  end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e50101',true);
do $$
declare affected integer; denied boolean := false;
begin
  if not exists(select 1 from storage.objects where bucket_id='company-logos'
    and name='b10d372e-09ae-4f18-9b5d-711416e50101/security-check.png') then
    raise exception 'Owner cannot read company asset';
  end if;
  if exists(select 1 from storage.objects where bucket_id='company-logos'
    and split_part(name,'/',1) <> auth.uid()::text) then
    raise exception 'Cross-account read allowed';
  end if;
  begin
    insert into storage.objects(bucket_id,name) values
    ('company-logos','b10d372e-09ae-4f18-9b5d-711416e50102/forbidden.png');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Cross-account upload allowed'; end if;
  delete from storage.objects where bucket_id='company-logos'
    and name='b10d372e-09ae-4f18-9b5d-711416e50102/security-check.png';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-account delete allowed'; end if;
  insert into storage.objects(bucket_id,name) values
    ('company-logos','b10d372e-09ae-4f18-9b5d-711416e50101/owner-upload.png');
  update storage.objects set name='b10d372e-09ae-4f18-9b5d-711416e50101/owner-renamed.png'
    where bucket_id='company-logos' and name='b10d372e-09ae-4f18-9b5d-711416e50101/owner-upload.png';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner update failed'; end if;
end $$;
reset role;
