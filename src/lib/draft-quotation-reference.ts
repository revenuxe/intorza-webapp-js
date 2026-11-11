import { supabase } from '@/integrations/supabase/client';
const key='intorza:draft-quotation-reference';
let pending: Promise<string> | null=null;
export function clearDraftReference() { sessionStorage.removeItem(key); pending=null; }
export function getDraftReference(): Promise<string> {
 const stored=sessionStorage.getItem(key);
 if (stored && /^QNO-[0-9A-Z]{6}$/.test(stored)) return Promise.resolve(stored);
 if (!pending) pending=(async()=>{
   const {data,error}=await supabase.rpc('reserve_quotation_reference');
   if(error || !data || !/^QNO-[0-9A-Z]{6}$/.test(data)) throw new Error('Unable to generate quotation reference. Please retry.');
   sessionStorage.setItem(key,data); return data;
 })().finally(()=>{pending=null;});
 return pending;
}
