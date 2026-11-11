import { getDraftReference, clearDraftReference } from './draft-quotation-reference';
const mockRpc=jest.fn();
jest.mock('@/integrations/supabase/client',()=>({supabase:{rpc:()=>mockRpc()}}));
beforeEach(()=>{clearDraftReference();mockRpc.mockReset();});
it('reserves once and keeps the same reference across login/editor remounts',async()=>{
 mockRpc.mockResolvedValue({data:'QNO-0001AZ',error:null});
 const refs=await Promise.all([getDraftReference(),getDraftReference()]);
 expect(refs).toEqual(['QNO-0001AZ','QNO-0001AZ']);
 expect(await getDraftReference()).toBe('QNO-0001AZ');
 expect(mockRpc).toHaveBeenCalledTimes(1);
});
it('retries failures and requests a new reference after clearing',async()=>{
 mockRpc.mockResolvedValueOnce({error:{message:'offline'}}).mockResolvedValueOnce({data:'QNO-0001AZ'}).mockResolvedValueOnce({data:'QNO-0001B0'});
 await expect(getDraftReference()).rejects.toThrow();
 expect(await getDraftReference()).toBe('QNO-0001AZ');
 clearDraftReference();expect(await getDraftReference()).toBe('QNO-0001B0');
});
