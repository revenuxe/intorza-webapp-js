do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    if has_table_privilege('anon',format('public.%I',t.tablename),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') then
      raise exception 'Anonymous private table privilege remained: %',t.tablename;
    end if;
    if has_table_privilege('authenticated',format('public.%I',t.tablename),'TRUNCATE,REFERENCES,TRIGGER') then
      raise exception 'Browser SQL administration privilege remained: %',t.tablename;
    end if;
  end loop;
  if not has_table_privilege('anon','public.companies_public','SELECT') then raise exception 'Public directory grant lost'; end if;
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e50102',true);
do $$ declare denied boolean := false; begin
  insert into public.team_member_requests(user_id,company_id,name,email,status)
  values(auth.uid(),'b10d372e-09ae-4f18-9b5d-711416e50101','Synthetic applicant','applicant@example.invalid','pending');
  begin
    insert into public.team_member_requests(user_id,company_id,name,email,status)
    values(auth.uid(),'b10d372e-09ae-4f18-9b5d-711416e50101','Synthetic applicant','applicant@example.invalid','approved');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Self-approved join request allowed'; end if;
end; $$;
reset role;
do $$ begin
  if exists(select 1 from storage.buckets where id in ('company-logos','gallery-images','room-photos')
    and (file_size_limit <> 15728640 or allowed_mime_types is null or 'image/svg+xml'=any(allowed_mime_types))) then
    raise exception 'Upload restrictions missing';
  end if;
end; $$;
select 'PASS: anonymous base-table grants removed, browser administration denied, directory retained, pending-only requests and upload limits' as result;
