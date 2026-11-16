import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuotationAutomation } from './useQuotationAutomation';
let mockOwner:string|null='first';
const mockRead=jest.fn();
jest.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:mockOwner?{id:mockOwner}:null})}));
jest.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 let owner='';const query={select:()=>query,eq:(_:string,id:string)=>{owner=id;return query;},order:()=>query,single:()=>mockRead(table,owner),limit:()=>mockRead(table,owner),then:(resolve:unknown,reject:unknown)=>mockRead(table,owner).then(resolve,reject)};return query;
}}}));
beforeEach(()=>{mockOwner='first';mockRead.mockReset();mockRead.mockImplementation(async(table,owner)=>({data:table==='clients'?[{id:owner,name:owner,address:owner}]:table==='quotation_preferences'?{last_warranty:owner==='first'?'5':'10'}:[],error:null}));});
it('masks old client data immediately and discards a late response after switching accounts',async()=>{
 const oldResolvers:Array<(value:unknown)=>void>=[];
 mockRead.mockImplementation((table,owner)=>owner==='first'?new Promise(resolve=>oldResolvers.push(resolve)):Promise.resolve({data:table==='clients'?[{id:owner,name:owner,address:owner}]:table==='quotation_preferences'?{}:[],error:null}));
 const {result,rerender}=renderHook(useQuotationAutomation);
 await waitFor(()=>expect(oldResolvers).toHaveLength(3));
 mockOwner='second';rerender();expect(result.current.clients).toEqual([]);
 await waitFor(()=>expect(result.current.clients[0]?.name).toBe('second'));
 await act(async()=>oldResolvers.forEach(resolve=>resolve({data:[{name:'Old client'}],error:null})));
 expect(result.current.clients[0]?.name).toBe('second');expect(result.current.getClientAddress('Old client')).toBeNull();
});
it('clears client and preference selectors on logout',async()=>{
 const {result,rerender}=renderHook(useQuotationAutomation);
 await waitFor(()=>expect(result.current.clients[0]?.name).toBe('first'));
 expect(result.current.getSmartDefaults().warranty).toBe('5');
 mockOwner=null;rerender();expect(result.current.clients).toEqual([]);
 expect(result.current.getClientAddress('first')).toBeNull();expect(result.current.getSmartDefaults().warranty).toBe('10');
});
