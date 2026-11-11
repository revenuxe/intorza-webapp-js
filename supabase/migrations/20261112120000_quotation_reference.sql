begin;
create sequence public.quotation_reference_sequence minvalue 1 maxvalue 2176782335 no cycle;
revoke all on sequence public.quotation_reference_sequence from public, anon, authenticated;
alter table public.quotations add column reference_no text;
create function public.next_quotation_reference() returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare n bigint; code text := ''; alphabet constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
begin
 n:=nextval('public.quotation_reference_sequence');
 while n>0 loop code:=substr(alphabet,(n%36)::integer+1,1)||code; n:=n/36; end loop;
 return 'QNO-'||lpad(code,6,'0');
end; $$;
revoke all on function public.next_quotation_reference() from public,anon,authenticated;
create function public.assign_quotation_reference() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then new.reference_no:=public.next_quotation_reference();
 elsif old.reference_no is not null then new.reference_no:=old.reference_no;
 elsif new.reference_no is null then new.reference_no:=public.next_quotation_reference(); end if;
 return new;
end; $$;
revoke all on function public.assign_quotation_reference() from public,anon,authenticated;
create trigger assign_quotation_reference before insert or update on public.quotations for each row execute function public.assign_quotation_reference();
update public.quotations set reference_no=public.next_quotation_reference() where reference_no is null;
alter table public.quotations alter column reference_no set not null;
alter table public.quotations add constraint quotations_reference_no_format check(reference_no ~ '^QNO-[0-9A-Z]{6}$');
alter table public.quotations add constraint quotations_reference_no_unique unique(reference_no);
commit;
