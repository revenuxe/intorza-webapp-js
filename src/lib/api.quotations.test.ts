import { quotationsApi } from './api';
const mockRange=jest.fn();
const query={select:()=>query,eq:jest.fn(()=>query),order:()=>query,range:mockRange};
jest.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>query}}));
it('loads all pages so reference/name search includes quotations beyond the first database page',async()=>{
 mockRange.mockResolvedValueOnce({data:Array.from({length:500},(_,i)=>({id:String(i)})),error:null}).mockResolvedValueOnce({data:[{id:'older',reference_no:'QNO-0001AZ'}],error:null});
 const result=await quotationsApi.list();
 expect(result.data).toHaveLength(501);
 expect(mockRange).toHaveBeenNthCalledWith(1,0,499);
 expect(mockRange).toHaveBeenNthCalledWith(2,500,999);
 expect(query.eq).toHaveBeenCalledWith('user_id','owner');
});
