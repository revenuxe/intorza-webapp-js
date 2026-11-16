import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';
const mockNavigate=jest.fn();
let mockAuth={user:{id:'first'} as {id:string}|null,isAuthenticated:true,loading:false};
const mockUnmount=jest.fn();
jest.mock('@/hooks/useAuth',()=>({useAuth:()=>mockAuth}));
jest.mock('@/lib/navigation',()=>({useNavigate:()=>mockNavigate,useLocation:()=>({pathname:'/admin/dashboard',search:'?tab=quotes'})}));
jest.mock('@/components/GlobalLoader',()=>({GlobalLoader:()=> <span>Restoring session</span>}));
function AccountContent(){useEffect(()=>()=>mockUnmount(),[]);return <span>Private dashboard</span>;}
beforeEach(()=>{jest.clearAllMocks();sessionStorage.clear();mockAuth={user:{id:'first'},isAuthenticated:true,loading:false};});
it('waits for restoration without mounting protected data',()=>{
 mockAuth.loading=true;render(<ProtectedRoute><AccountContent/></ProtectedRoute>);
 expect(screen.getByText('Restoring session')).toBeVisible();
 expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();expect(mockNavigate).not.toHaveBeenCalled();
});
it('unmounts data on logout and uses the portal login route',()=>{
 const app=()=> <ProtectedRoute loginPath="/admin/login"><AccountContent/></ProtectedRoute>;
 const view=render(app());mockAuth={user:null,isAuthenticated:false,loading:false};view.rerender(app());
 expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();expect(mockUnmount).toHaveBeenCalledTimes(1);
 expect(mockNavigate).toHaveBeenCalledWith('/admin/login',{replace:true});expect(sessionStorage.getItem('returnPath')).toBe('/admin/dashboard?tab=quotes');
});
it('remounts account components when switching identities',()=>{
 const app=()=> <ProtectedRoute><AccountContent/></ProtectedRoute>;const view=render(app());
 mockAuth={...mockAuth,user:{id:'second'}};view.rerender(app());expect(mockUnmount).toHaveBeenCalledTimes(1);
 expect(screen.getByText('Private dashboard')).toBeVisible();
});
