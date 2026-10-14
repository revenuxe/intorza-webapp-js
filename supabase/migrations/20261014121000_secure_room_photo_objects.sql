begin;

-- Invoker rights intentionally preserve room_photos' project/team RLS.
create or replace function public.can_access_room_photo_object(p_name text)
returns boolean language sql stable security invoker
set search_path = public, pg_temp as $$
  select auth.uid() is not null and (
    split_part(p_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.room_photos rp
      where split_part(regexp_replace(rp.photo_url,
        '^https?://[^/]+/storage/v1/object/(sign|public|authenticated)/room-photos/', ''), '?', 1) = p_name
    )
  );
$$;
revoke all on function public.can_access_room_photo_object(text) from public, anon;
-- Policies may evaluate this for anonymous requests; it returns false without
-- an authenticated identity and never runs with elevated rights.
grant execute on function public.can_access_room_photo_object(text) to anon, authenticated;

-- Prevent creating an authorized room row pointing at somebody else's object.
-- Existing URLs continue to be readable; all new uploads use durable owner keys.
create policy "Room photo references require uploader ownership"
on public.room_photos as restrictive for insert to authenticated
with check (split_part(photo_url, '/', 1) = auth.uid()::text
  and photo_url !~ '(^/|\\|[?#]|(^|/)\.\.?(/|$))');

drop policy if exists "Anyone can view room photos" on storage.objects;
drop policy if exists "Authenticated users can view room photos" on storage.objects;
drop policy if exists "Authenticated users can upload room photos" on storage.objects;
drop policy if exists "Authenticated users can delete room photos" on storage.objects;
drop policy if exists "Users can delete own room photos" on storage.objects;

create policy "Authorized room photo reads" on storage.objects
for select to authenticated
using (bucket_id = 'room-photos' and public.can_access_room_photo_object(name));
create policy "Owner room photo uploads" on storage.objects
for insert to authenticated
with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Authorized room photo deletes" on storage.objects
for delete to authenticated
using (bucket_id = 'room-photos' and public.can_access_room_photo_object(name));

-- Guard against a future permissive policy accidentally reopening this bucket.
create policy "Room photo read boundary" on storage.objects as restrictive
for select to public using (bucket_id <> 'room-photos' or
  (auth.uid() is not null and public.can_access_room_photo_object(name)));
create policy "Room photo upload boundary" on storage.objects as restrictive
for insert to public with check (bucket_id <> 'room-photos' or
  (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text));
create policy "Room photo delete boundary" on storage.objects as restrictive
for delete to public using (bucket_id <> 'room-photos' or
  (auth.uid() is not null and public.can_access_room_photo_object(name)));
create policy "Room photo update boundary" on storage.objects as restrictive
for update to public using (bucket_id <> 'room-photos') with check (bucket_id <> 'room-photos');

commit;
