import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuotationAutomation } from './useQuotationAutomation';
let mockOwner:string|null='first';
const mockRead=jest.fn();
const mockUpsert=jest.fn();
jest.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:mockOwner?{id:mockOwner}:null})}));
jest.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 let owner='';const query={upsert:(data: { user_id: string })=>{owner=data.user_id;mockUpsert(data);return query;},select:()=>query,eq:(_:string,id:string)=>{owner=id;return query;},order:()=>query,single:()=>mockRead(table,owner),limit:()=>mockRead(table,owner),then:(resolve:unknown,reject:unknown)=>mockRead(table,owner).then(resolve,reject)};return query;
}}}));
beforeEach(()=>{mockOwner='first';mockUpsert.mockReset();mockRead.mockReset();mockRead.mockImplementation(async(table,owner)=>({data:table==='clients'?[{id:owner,name:owner,address:owner}]:table==='quotation_preferences'?{last_warranty:owner==='first'?'5':'10'}:[],error:null}));});
it('requires a fresh choice for both dates even when an old validity default exists',async()=>{
 mockRead.mockImplementation(async table=>({data:table==='quotation_preferences'?{default_quotation_valid_days:45}:[],error:null}));
 const {result}=renderHook(useQuotationAutomation);
 await waitFor(()=>expect(result.current.loading).toBe(false));
 expect(result.current.getSmartDefaults()).toMatchObject({quotationValidTill:'',projectDeadline:''});
});
it('remembers independently chosen durations for new quotations',async()=>{
 const {result}=renderHook(useQuotationAutomation);
 await waitFor(()=>expect(result.current.loading).toBe(false));
 mockRead.mockResolvedValue({data:{chosen_valid_days:30,chosen_deadline_days:45},error:null});
 await act(async()=>{await result.current.saveLastUsedPreferences({validDays:30,deadlineDays:45});});
 expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({user_id:'first',chosen_valid_days:30,chosen_deadline_days:45}));
 const defaults=result.current.getSmartDefaults();
 const proposal=new Date(`${defaults.dateOfProposal}T12:00:00`);
 const valid=new Date(`${defaults.quotationValidTill}T12:00:00`);
 const deadline=new Date(`${defaults.projectDeadline}T12:00:00`);
 expect(Math.round((valid.getTime()-proposal.getTime())/86400000)).toBe(30);
 expect(Math.round((deadline.getTime()-proposal.getTime())/86400000)).toBe(45);
});
it('prefills the remembered first location ahead of a later project location',async()=>{
 mockRead.mockImplementation(async table=>({data:table==='quotation_preferences'?{default_place_of_project:' Bengaluru ',last_place_of_project:'Mumbai'}:[],error:null}));
 const {result}=renderHook(useQuotationAutomation);
 await waitFor(()=>expect(result.current.loading).toBe(false));
 expect(result.current.getSmartDefaults().placeOfProject).toBe('Bengaluru');
});
it('refreshes preferences after saving and never clears the remembered location with an empty project',async()=>{
 const {result}=renderHook(useQuotationAutomation);
 await waitFor(()=>expect(result.current.loading).toBe(false));
 mockRead.mockResolvedValue({data:{default_place_of_project:'Bengaluru'},error:null});
 await act(async()=>{await result.current.saveLastUsedPreferences({placeOfProject:'   '});});
 expect(mockUpsert.mock.calls[0][0]).not.toHaveProperty('last_place_of_project');
 expect(mockUpsert.mock.calls[0][0]).not.toHaveProperty('default_place_of_project');
 expect(result.current.getSmartDefaults().placeOfProject).toBe('Bengaluru');
});
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
