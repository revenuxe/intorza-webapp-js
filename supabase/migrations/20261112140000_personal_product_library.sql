begin;
-- Only personal library differences are stored. The versioned public catalog is
-- shipped with the library UI; existing item_usage_patterns are not modified.
create table public.library_personal_entries (
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id text not null check(length(entry_id) between 1 and 240),
 kind text not null check(kind in ('product','category')),
 data jsonb,
 revision text not null check(length(revision) between 1 and 100),
 updated_at timestamptz not null default now(),
 primary key(user_id,entry_id),
 constraint library_entry_object check(data is null or jsonb_typeof(data)='object'),
 constraint library_entry_size check(data is null or octet_length(data::text)<=65536),
 constraint library_entry_identity check(data is null or data->>'id'=entry_id)
);
alter table public.library_personal_entries enable row level security;
revoke all on public.library_personal_entries from anon;
grant select,insert,update,delete on public.library_personal_entries to authenticated;
create policy "Read own personal library" on public.library_personal_entries for select to authenticated using(auth.uid()=user_id);
create policy "Add own personal library" on public.library_personal_entries for insert to authenticated with check(auth.uid()=user_id);
create policy "Update own personal library" on public.library_personal_entries for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "Delete own personal library" on public.library_personal_entries for delete to authenticated using(auth.uid()=user_id);
commit;
