-- Saving a quotation for delivery (pending) is a Pro-only action.
-- Drafts remain available to every authenticated user, including for PDF download.
create or replace function public.enforce_pro_for_quotation_delivery()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'pending' and not public.is_pro_user(auth.uid()) then
    raise exception 'An active Pro subscription is required to save and send a quotation'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_pro_for_quotation_delivery() from public, anon, authenticated;

drop trigger if exists require_pro_for_quotation_delivery on public.quotations;
create trigger require_pro_for_quotation_delivery
before insert or update of status on public.quotations
for each row execute function public.enforce_pro_for_quotation_delivery();
