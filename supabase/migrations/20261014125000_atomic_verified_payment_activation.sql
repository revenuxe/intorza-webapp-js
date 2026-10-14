begin;
create table public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  window_started timestamptz not null default now(),
  hits integer not null default 1,
  primary key(user_id,operation)
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on public.api_rate_limits to service_role;
create or replace function public.consume_user_api_limit(p_user uuid,p_operation text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare cap integer; used integer;
begin
  cap:=case p_operation when 'razorpay-create-subscription' then 10 when 'razorpay-verify-payment' then 30 when 'create-team-member-auth' then 5 else 0 end;
  if cap=0 or p_user is null then raise exception 'Unsupported API operation'; end if;
  insert into public.api_rate_limits(user_id,operation) values(p_user,p_operation)
  on conflict(user_id,operation) do update set
    window_started=case when api_rate_limits.window_started <= now()-interval '1 minute' then now() else api_rate_limits.window_started end,
    hits=case when api_rate_limits.window_started <= now()-interval '1 minute' then 1 else least(api_rate_limits.hits+1,1000000) end
  returning hits into used;
  return used<=cap;
end; $$;
revoke all on function public.consume_user_api_limit(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_user_api_limit(uuid,text) to service_role;
alter table public.profiles add column if not exists pro_payment_id text;
create or replace function public.activate_verified_razorpay_payment(p_user uuid,p_payment text,p_order text,p_amount integer,p_currency text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare existing public.payment_logs; profile public.profiles;
begin
  if p_user is null or p_payment is null or p_order is null or p_currency is null or p_payment !~ '^pay_[A-Za-z0-9]+$' or p_order !~ '^order_[A-Za-z0-9]+$' or p_amount is distinct from 100 or p_currency not in ('INR','USD') then raise exception 'Invalid verified payment facts'; end if;
  perform pg_advisory_xact_lock(hashtextextended('razorpay:'||p_payment,0));
  select * into existing from public.payment_logs where provider='razorpay' and
    (provider_event_id='activation:'||p_payment or (provider_event_id=p_payment and status='captured')) limit 1;
  if found and existing.user_id <> p_user then raise exception 'Payment belongs to another account' using errcode='42501'; end if;
  select * into profile from public.profiles where id=p_user for update;
  if not found then raise exception 'Profile not found'; end if;
  if existing.id is not null then return jsonb_build_object('success',true,'duplicate',true,'isPro',profile.is_pro,'proExpiry',profile.pro_expiry); end if;
  insert into public.payment_logs(user_id,provider,event_type,provider_event_id,amount,currency,status,raw_payload)
  values(p_user,'razorpay','pro_activation','activation:'||p_payment,p_amount,p_currency,'captured',jsonb_build_object('payment_id',p_payment,'order_id',p_order,'plan','monthly'));
  update public.profiles set is_pro=true,pro_since=now(),pro_plan='monthly',pro_expiry=now()+interval '30 days',payment_status='active',pro_payment_id=p_payment where id=p_user returning * into profile;
  insert into public.subscription_events(user_id,event,notes,actor) values(p_user,'pro_activated','Verified captured payment: '||p_payment,'system');
  return jsonb_build_object('success',true,'duplicate',false,'isPro',profile.is_pro,'proExpiry',profile.pro_expiry);
end; $$;
revoke all on function public.activate_verified_razorpay_payment(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.activate_verified_razorpay_payment(uuid,text,text,integer,text) to service_role;
create or replace function public.record_verified_razorpay_event(p_event text,p_type text,p_user uuid,p_payment text,p_amount integer,p_currency text,p_full_refund boolean,p_subscription text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare prior public.payment_logs;
begin
  if p_event is null or length(p_event)>200 or p_type not in ('payment.failed','refund.created','refund.processed','subscription.cancelled') then raise exception 'Invalid lifecycle event'; end if;
  perform pg_advisory_xact_lock(hashtextextended('razorpay-event:'||p_event,0));
  select * into prior from public.payment_logs where provider_event_id='webhook:'||p_event;
  if found then
    if prior.user_id <> p_user then raise exception 'Event ownership mismatch'; end if;
    return jsonb_build_object('received',true,'duplicate',true);
  end if;
  perform 1 from public.profiles where id=p_user for update;
  if not found then raise exception 'Profile not found'; end if;
  if p_type='refund.processed' and p_full_refund then
    update public.profiles set is_pro=false,payment_status='refunded' where id=p_user and pro_payment_id=p_payment;
  elsif p_type='subscription.cancelled' then
    update public.profiles set payment_status='canceled' where id=p_user and provider_subscription_id=p_subscription;
  end if;
  insert into public.payment_logs(user_id,provider,event_type,provider_event_id,amount,currency,status,raw_payload)
  values(p_user,'razorpay',p_type,'webhook:'||p_event,p_amount,p_currency,p_type,jsonb_build_object('payment_id',p_payment,'subscription_id',p_subscription));
  insert into public.subscription_events(user_id,event,notes,actor) values(p_user,p_type,'Verified provider event: '||p_event,'webhook');
  return jsonb_build_object('received',true,'processed',true);
end; $$;
revoke all on function public.record_verified_razorpay_event(text,text,uuid,text,integer,text,boolean,text) from public,anon,authenticated;
grant execute on function public.record_verified_razorpay_event(text,text,uuid,text,integer,text,boolean,text) to service_role;
commit;
