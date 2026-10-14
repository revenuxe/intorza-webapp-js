import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCapturedPayment } from '../_shared/verified-payment.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json'};
const reply=(body: unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
serve(async req=>{
  if (req.method==='OPTIONS') return new Response(null,{headers});
  if (req.method!=='POST') return reply({error:'Method not allowed'},405);
  const authorization=req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply({error:'Unauthorized'},401);
  try {
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const {data:{user},error:authError}=await supabase.auth.getUser(authorization.slice(7));
    if (authError || !user) return reply({error:'Unauthorized'},401);
    const {data:allowed,error:limitError}=await supabase.rpc('consume_user_api_limit',{p_user:user.id,p_operation:'razorpay-verify-payment'});
    if (limitError) throw new Error('Request limit could not be checked');
    if (!allowed) return reply({error:'Too many verification attempts. Please wait a minute.'},429);
    const {razorpay_order_id:orderId,razorpay_payment_id:paymentId,razorpay_signature:signature}=await req.json();
    if (typeof orderId!=='string' || !/^order_[A-Za-z0-9]+$/.test(orderId) || typeof paymentId!=='string' || !/^pay_[A-Za-z0-9]+$/.test(paymentId) || typeof signature!=='string' || !/^[a-f0-9]{64}$/i.test(signature)) return reply({error:'Invalid payment details'},400);
    const secret=Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!secret) return reply({error:'Payment verification is not configured'},503);
    const encoder=new TextEncoder();
    const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const bytes=Uint8Array.from(signature.match(/.{2}/g)!,hex=>parseInt(hex,16));
    if (!await crypto.subtle.verify('HMAC',key,bytes,encoder.encode(`${orderId}|${paymentId}`))) return reply({error:'Payment verification failed'},400);
    const {payment,userId}=await getCapturedPayment(paymentId,user.id,orderId);
    const {data,error}=await supabase.rpc('activate_verified_razorpay_payment',{p_user:userId,p_payment:payment.id,p_order:orderId,p_amount:payment.amount,p_currency:payment.currency});
    if (error) throw new Error('Verified payment could not be recorded; please retry');
    return reply(data);
  } catch (error) {
    console.error('Payment verification failed');
    return reply({error:error instanceof Error?error.message:'Payment verification failed'},500);
  }
});
