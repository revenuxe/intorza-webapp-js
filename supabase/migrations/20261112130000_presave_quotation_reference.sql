begin;
create function public.reserve_quotation_reference() returns text language sql security definer set search_path=public,pg_temp as $$ select public.next_quotation_reference(); $$;
revoke all on function public.reserve_quotation_reference() from public;
grant execute on function public.reserve_quotation_reference() to anon,authenticated;
create or replace function public.assign_quotation_reference() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then
   if new.reference_no is null or new.reference_no !~ '^QNO-[0-9A-Z]{6}$' then new.reference_no:=public.next_quotation_reference(); end if;
 elsif old.reference_no is not null then new.reference_no:=old.reference_no;
 elsif new.reference_no is null then new.reference_no:=public.next_quotation_reference(); end if;
 return new;
end; $$;
commit;
