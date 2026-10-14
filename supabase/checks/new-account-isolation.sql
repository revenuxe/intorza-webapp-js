-- Test current deployed database policies, without applying proposed changes.
-- Synthetic records only; all records and entitlement changes roll back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e50101','isolation-owner@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e50102','isolation-new-account@example.invalid','{}');
insert into public.clients(id,user_id,name) values
('b10d372e-09ae-4f18-9b5d-711416e60101','b10d372e-09ae-4f18-9b5d-711416e50101','Synthetic client');
insert into public.quotations(id,user_id,quotation_number,project_name,client_name) values
('b10d372e-09ae-4f18-9b5d-711416e60101','b10d372e-09ae-4f18-9b5d-711416e50101','ISOLATION-ROLLBACK','Synthetic project','Synthetic client');
insert into public.invoices(id,user_id,invoice_number,project_name,client_name,total_amount) values
('b10d372e-09ae-4f18-9b5d-711416e60101','b10d372e-09ae-4f18-9b5d-711416e50101','ISOLATION-ROLLBACK','Synthetic project','Synthetic client',100);
insert into public.payments(id,invoice_id,amount,payment_method) values
('b10d372e-09ae-4f18-9b5d-711416e60101','b10d372e-09ae-4f18-9b5d-711416e60101',10,'cash');
insert into public.feedback(id,user_id,rating,trigger_action) values
('b10d372e-09ae-4f18-9b5d-711416e60101','b10d372e-09ae-4f18-9b5d-711416e50101',5,'synthetic-security-check');
insert into public.team_members(id,company_id,name,email) values
('b10d372e-09ae-4f18-9b5d-711416e60101','b10d372e-09ae-4f18-9b5d-711416e50101','Synthetic member','isolation-member@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e50101',true);
do $$ declare t text; visible boolean; begin
  foreach t in array array['clients','invoices','quotations','feedback','team_members','payments'] loop
    execute format('select exists(select 1 from public.%I where id = %L::uuid)',t,'b10d372e-09ae-4f18-9b5d-711416e60101') into visible;
    if not visible then raise exception 'Positive owner control failed: %',t; end if;
  end loop;
end; $$;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e50102',true);
do $$ declare t text; visible boolean; begin
  foreach t in array array['clients','invoices','quotations','feedback','team_members','payments'] loop
    execute format('select exists(select 1 from public.%I where id = %L::uuid)',t,'b10d372e-09ae-4f18-9b5d-711416e60101') into visible;
    if visible then raise exception 'New account can read another tenant: %',t; end if;
  end loop;
end; $$;
-- Change only this test user's own synthetic record, never real entitlements.
do $$ begin
  begin
    update public.profiles set is_pro=true,pro_expiry=now()+interval '1 day' where id=auth.uid();
  exception when insufficient_privilege then null;
  end;
end; $$;
select exists(select 1 from public.profiles where id='b10d372e-09ae-4f18-9b5d-711416e50101') as foreign_profile_visible,
  public.is_pro_user(auth.uid()) as synthetic_self_upgrade_allowed,
  'PASS: owner controls and six-table new-account read isolation; profile/upgrade results are separate findings' as result;
rollback;
