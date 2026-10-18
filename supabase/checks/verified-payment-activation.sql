insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e80101','payment-owner@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e80102','payment-other@example.invalid','{}');
set local role authenticated;
do $$ declare denied boolean := false; begin
  begin perform public.activate_verified_razorpay_payment('b10d372e-09ae-4f18-9b5d-711416e80101','pay_security1','order_security1',49900,'INR');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Browser can invoke trusted payment activation'; end if;
end; $$;
reset role;
set local role service_role;
do $$ declare i integer; begin
  for i in 1..5 loop
    if not public.consume_user_api_limit('b10d372e-09ae-4f18-9b5d-711416e80101','create-team-member-auth') then raise exception 'Rate limit rejected permitted request'; end if;
  end loop;
  if public.consume_user_api_limit('b10d372e-09ae-4f18-9b5d-711416e80101','create-team-member-auth') then raise exception 'Rate limit did not reject excess request'; end if;
  if not public.consume_user_api_limit('b10d372e-09ae-4f18-9b5d-711416e80102','create-team-member-auth') then raise exception 'Rate limit leaked across users'; end if;
end; $$;
do $$ declare rejected boolean; facts record; begin
  for facts in select * from (values (100,'INR'),(49800,'INR'),(49900,'USD'),(49900,'EUR'),(null::integer,'INR')) as amounts(amount,currency) loop
    rejected:=false;
    begin
      perform public.activate_verified_razorpay_payment('b10d372e-09ae-4f18-9b5d-711416e80101','pay_wrongAmount','order_wrongAmount',facts.amount,facts.currency);
    exception when raise_exception then
      if sqlerrm <> 'Invalid verified payment facts' then raise; end if;
      rejected:=true;
    end;
    if not rejected then raise exception 'Invalid amount/currency accepted: % %',facts.amount,facts.currency; end if;
  end loop;
  perform public.activate_verified_razorpay_payment('b10d372e-09ae-4f18-9b5d-711416e80102','pay_usdValid','order_usdValid',100,'USD');
  if not exists(select 1 from public.payment_logs where provider_event_id='activation:pay_usdValid' and amount=100 and currency='USD') then raise exception 'USD billing missing'; end if;
  update public.profiles set is_pro=false where id='b10d372e-09ae-4f18-9b5d-711416e80102';
end; $$;

do $$ declare a jsonb; b jsonb; denied boolean := false; begin
  a:=public.activate_verified_razorpay_payment('b10d372e-09ae-4f18-9b5d-711416e80101','pay_security1','order_security1',49900,'INR');
  b:=public.activate_verified_razorpay_payment('b10d372e-09ae-4f18-9b5d-711416e80101','pay_security1','order_security1',49900,'INR');
  if (select count(*) from public.payment_logs where provider_event_id='activation:pay_security1' and amount=49900 and currency='INR' and status='captured') <> 1 then raise exception 'INR billing record missing or duplicated'; end if;
  if not (a->>'isPro')::boolean or not (b->>'duplicate')::boolean or a->>'proExpiry' <> b->>'proExpiry' then raise exception 'Activation idempotency failed'; end if;
  begin perform public.activate_verified_razorpay_payment('b10d372e-09ae-4f18-9b5d-711416e80102','pay_security1','order_security1',49900,'INR');
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Cross-account payment replay allowed'; end if;
  if exists(select 1 from public.profiles where id='b10d372e-09ae-4f18-9b5d-711416e80102' and is_pro) then raise exception 'Other account upgraded'; end if;
  perform public.activate_verified_razorpay_payment('b10d372e-09ae-4f18-9b5d-711416e80101','pay_security2','order_security2',49900,'INR');
  perform public.record_verified_razorpay_event('security-old-refund','refund.processed','b10d372e-09ae-4f18-9b5d-711416e80101','pay_security1',49900,'INR',true);
  if not exists(select 1 from public.profiles where id='b10d372e-09ae-4f18-9b5d-711416e80101' and is_pro) then raise exception 'Old refund revoked newer entitlement'; end if;
  perform public.record_verified_razorpay_event('security-refund','refund.processed','b10d372e-09ae-4f18-9b5d-711416e80101','pay_security2',49900,'INR',true);
  perform public.record_verified_razorpay_event('security-refund','refund.processed','b10d372e-09ae-4f18-9b5d-711416e80101','pay_security2',49900,'INR',true);
  if exists(select 1 from public.profiles where id='b10d372e-09ae-4f18-9b5d-711416e80101' and is_pro) then raise exception 'Current full refund did not revoke'; end if;
  if (select count(*) from public.payment_logs where provider_event_id='webhook:security-refund') <> 1 then raise exception 'Duplicate webhook receipt'; end if;
end; $$;
reset role;
select 'PASS: service-only atomic activation, idempotency, cross-account replay denial, refund provenance and duplicate-event handling' as result;
