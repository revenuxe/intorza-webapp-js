begin;
-- Browser clients do not need SQL administration privileges or anonymous
-- access to private base tables. Public directory/response APIs remain explicit.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('revoke all on public.%I from public, anon', t.tablename);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t.tablename);
  end loop;
end; $$;
revoke insert, update, delete on public.payment_logs, public.subscription_events from authenticated;

-- Return before querying any table when invoked by an anonymous storage policy.
create or replace function public.can_access_room_photo_object(p_name text)
returns boolean language plpgsql stable security invoker
set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then return false; end if;
  if split_part(p_name,'/',1)=auth.uid()::text then return true; end if;
  return exists(select 1 from public.room_photos rp where
    split_part(regexp_replace(rp.photo_url,
      '^https?://[^/]+/storage/v1/object/(sign|public|authenticated)/room-photos/', ''), '?', 1)=p_name);
end; $$;

create policy "New join requests must be pending" on public.team_member_requests
as restrictive for insert to authenticated
with check (user_id=auth.uid() and status='pending'
  and rejection_reason is null and docs_request_note is null);

-- Match the existing client maximum; prevent direct API bypass of that limit.
-- SVG uploads are rasterized by the uploader and are not accepted as raw files.
update storage.buckets set file_size_limit=15728640,
  allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif',
    'image/heic','image/heif','image/avif','image/bmp','image/tiff']
where id in ('company-logos','gallery-images','room-photos');
commit;
