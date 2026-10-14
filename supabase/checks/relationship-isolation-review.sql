-- Detect relationship-policy gaps using synthetic data; persist nothing.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e90101','relationship-owner@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e90102','relationship-other@example.invalid','{}');
update public.profiles set is_pro=true,pro_expiry=now()+interval '1 day' where id='b10d372e-09ae-4f18-9b5d-711416e90101';
insert into public.quotations(id,user_id,quotation_number,project_name,client_name) values
('b10d372e-09ae-4f18-9b5d-711416e90201','b10d372e-09ae-4f18-9b5d-711416e90102','RELATIONSHIP-CHECK','Synthetic','Synthetic');
insert into public.team_members(id,company_id,name,email) values
('b10d372e-09ae-4f18-9b5d-711416e90301','b10d372e-09ae-4f18-9b5d-711416e90101','Synthetic own worker','relationship-worker@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e90101',true);
insert into public.quotations(id,user_id,quotation_number,project_name,client_name) values
('b10d372e-09ae-4f18-9b5d-711416e90202',auth.uid(),'RELATIONSHIP-OWN','Synthetic','Synthetic');
do $$ declare denied boolean := false; assignment uuid; begin
  begin
    insert into public.team_project_assignments(team_member_id,quotation_id)
    values('b10d372e-09ae-4f18-9b5d-711416e90301','b10d372e-09ae-4f18-9b5d-711416e90201');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'Cross-tenant assignment INSERT allowed'; end if;
  insert into public.team_project_assignments(team_member_id,quotation_id)
  values('b10d372e-09ae-4f18-9b5d-711416e90301','b10d372e-09ae-4f18-9b5d-711416e90202') returning id into assignment;
  denied := false;
  begin
    update public.team_project_assignments set quotation_id='b10d372e-09ae-4f18-9b5d-711416e90201' where id=assignment;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'Cross-tenant assignment UPDATE allowed'; end if;
  update public.team_project_assignments set quotation_id=null where id=assignment;
  if not exists(select 1 from public.team_project_assignments where id=assignment and quotation_id is null) then raise exception 'Permitted update failed'; end if;
end; $$;
select 'PASS: own assignment works; foreign target insert/update denied; nullable target preserved' as result;
rollback;
