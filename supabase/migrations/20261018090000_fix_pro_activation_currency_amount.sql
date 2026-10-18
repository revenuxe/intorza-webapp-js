begin;
-- Checkout and provider verification use minor units: INR 49900 = Rs. 499; USD 100 = $1.
-- Replace the deployed function; keep activation and billing atomic and idempotent.
create or replace function public.activate_verified_razorpay_payment(p_user uuid,p_payment text,p_order text,p_amount integer,p_currency text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare existing public.payment_logs; profile public.profiles;
begin
  if p_user is null or p_payment is null or p_order is null or p_currency is null or p_payment !~ '^pay_[A-Za-z0-9]+$' or p_order !~ '^order_[A-Za-z0-9]+$' or p_currency not in ('INR','USD') or p_amount is distinct from (case p_currency when 'INR' then 49900 when 'USD' then 100 end) then raise exception 'Invalid verified payment facts'; end if;
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
commit;
