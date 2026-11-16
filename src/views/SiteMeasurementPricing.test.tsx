import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import View from './SiteMeasurementPricing';
const mockNavigate=jest.fn(),mockRpc=jest.fn();
const room={id:'room',room_type:'Kitchen',room_name:null,width_ft:10,length_ft:12,area_sqft:120,pricing_mode:'per_unit',quantity:2,rate_per_unit:750,final_amount:999};
jest.mock('@/lib/navigation',()=>({useParams:()=>({id:'visit'}),useNavigate:()=>mockNavigate}));
jest.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'owner'}})}));
jest.mock('@/hooks/useLocalization',()=>({useLocalization:()=>({formatCurrency:(amount:number)=>'Rs '+amount})}));
jest.mock('@/integrations/supabase/client',()=>({supabase:{rpc:(...args:unknown[])=>mockRpc(...args),from:(table:string)=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{id:'visit',client_name:'Client',quotation_id:null},error:null}),order:async()=>({data:table==='site_measurement_rooms'?[room]:[],error:null})};return query;}}}));
beforeEach(()=>{jest.clearAllMocks();mockRpc.mockResolvedValue({data:{quotation_id:'quote'},error:null});});
it('creates a reviewed draft through one atomic conversion and preserves pricing quantity',async()=>{
 render(<View/>);await screen.findByText('Prepare a quotation');expect(screen.getByText('Rs 1500')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Create draft quotation'}));
 await waitFor(()=>expect(mockNavigate).toHaveBeenCalledWith('/?id=quote'));
 expect(mockRpc).toHaveBeenCalledTimes(1);
 expect(mockRpc).toHaveBeenCalledWith('convert_site_measurement',expect.objectContaining({p_project_id:'visit',p_skip_amounts:false,p_pricing:[expect.objectContaining({id:'room',expected_width_ft:10,expected_length_ft:12,quantity:2,rate_per_unit:750})]}));
});
it('keeps a failed conversion retryable with its original request ID',async()=>{
 mockRpc.mockResolvedValueOnce({data:null,error:{message:'Connection interrupted'}});
 render(<View/>);fireEvent.click(await screen.findByRole('button',{name:'Create without prices'}));
 expect(await screen.findByText('Connection interrupted')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Create without prices'}));
 await waitFor(()=>expect(mockNavigate).toHaveBeenCalledWith('/?id=quote'));
 expect(mockRpc.mock.calls[1][1].p_request_id).toBe(mockRpc.mock.calls[0][1].p_request_id);
 expect(mockRpc.mock.calls[1][1].p_skip_amounts).toBe(true);
});
