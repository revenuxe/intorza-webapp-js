import { act, render, screen } from '@testing-library/react';
import AdminGuard from './AdminGuard';
const mockRpc=jest.fn();const mockNavigate=jest.fn();
let mockAuth={user:{id:'admin'} as {id:string}|null,loading:false};
jest.mock('@/hooks/useAuth',()=>({useAuth:()=>mockAuth}));
jest.mock('@/lib/navigation',()=>({useNavigate:()=>mockNavigate}));
jest.mock('@/integrations/supabase/client',()=>({supabase:{rpc:()=>mockRpc()}}));
jest.mock('@/components/GlobalLoader',()=>({GlobalLoader:()=> <span>Checking access</span>}));
beforeEach(()=>{jest.clearAllMocks();mockAuth={user:{id:'admin'},loading:false};});
const app=()=> <AdminGuard><span>Private admin data</span></AdminGuard>;
it('requires a new role check after logout and login with the same account',async()=>{
 mockRpc.mockResolvedValueOnce({data:true,error:null});const view=render(app());await act(async()=>{});
 expect(screen.getByText('Private admin data')).toBeVisible();
 mockAuth={user:null,loading:false};view.rerender(app());expect(screen.queryByText('Private admin data')).not.toBeInTheDocument();
 let finish!:(value:unknown)=>void;mockRpc.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 mockAuth={user:{id:'admin'},loading:false};view.rerender(app());expect(screen.queryByText('Private admin data')).not.toBeInTheDocument();
 await act(async()=>finish({data:false,error:null}));expect(mockNavigate).toHaveBeenCalledWith('/admin/login',{replace:true});
 expect(screen.queryByText('Private admin data')).not.toBeInTheDocument();
});
it('ignores an old administrator response after the account changes',async()=>{
 let finish!:(value:unknown)=>void;mockRpc.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 const view=render(app());mockRpc.mockResolvedValueOnce({data:false,error:null});mockAuth={user:{id:'other'},loading:false};view.rerender(app());
 await act(async()=>finish({data:true,error:null}));expect(screen.queryByText('Private admin data')).not.toBeInTheDocument();
});
