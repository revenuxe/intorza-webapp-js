import { act, renderHook } from '@testing-library/react';
import { useAuthAction } from './useAuthAction';
const mockGetUser=jest.fn();const mockNavigate=jest.fn();const mockToast=jest.fn();
jest.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:()=>mockGetUser()}}}));
jest.mock('@/lib/navigation',()=>({useNavigate:()=>mockNavigate,useLocation:()=>({pathname:'/',search:'?id=quote'})}));
jest.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mockToast})}));
beforeEach(()=>{jest.clearAllMocks();sessionStorage.clear();});
it('executes only a verified authenticated action',async()=>{
 mockGetUser.mockResolvedValue({data:{user:{id:'owner'}},error:null});const {result}=renderHook(useAuthAction);const action=jest.fn();
 await act(async()=>result.current.requireAuth(action));expect(action).toHaveBeenCalledTimes(1);expect(mockNavigate).not.toHaveBeenCalled();
});
it('preserves a draft before redirecting an expired session to sign-in',async()=>{
 mockGetUser.mockResolvedValue({data:{user:null},error:{status:401}});const {result}=renderHook(useAuthAction);const action=jest.fn();
 await act(async()=>result.current.requireAuth(action,'saveDraft',{clientName:'Client'}));
 expect(action).not.toHaveBeenCalled();expect(mockNavigate).toHaveBeenCalledWith('/auth');
 expect(result.current.getPendingAction<{clientName:string}>().formData?.clientName).toBe('Client');
});
it.each(['throw','offline'])('keeps the editor when authentication cannot be checked: %s',async(mode)=>{
 if(mode==='throw') mockGetUser.mockRejectedValue(new Error('Offline'));
 else mockGetUser.mockResolvedValue({data:{user:null},error:{name:'AuthRetryableFetchError',status:0}});
 const {result}=renderHook(useAuthAction);const action=jest.fn();await act(async()=>result.current.requireAuth(action));
 expect(action).not.toHaveBeenCalled();expect(mockNavigate).not.toHaveBeenCalled();expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({title:'Sign-in check unavailable'}));
});
it('discards malformed stored JSON without crashing restoration',()=>{
 sessionStorage.setItem('pendingFormData','{broken');sessionStorage.setItem('pendingAction','saveDraft');
 const {result}=renderHook(useAuthAction);expect(result.current.getPendingAction().formData).toBeNull();expect(sessionStorage.getItem('pendingFormData')).toBeNull();
});
