import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { RoomFormSheet } from './RoomFormSheet';
const load=jest.fn().mockResolvedValue({data:[],error:null});
jest.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{const query={select:()=>query,eq:()=>query,order:()=>load()};return query;}}}));
beforeAll(()=>{Element.prototype.scrollIntoView=jest.fn();});
it('saves feet/inches as decimal feet and keeps a stable new-room ID across retries',async()=>{
 const save=jest.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(undefined);
 render(<RoomFormSheet open onOpenChange={jest.fn()} room={null} onSave={save}/>);
 fireEvent.change(screen.getByLabelText('Width (feet)'),{target:{value:'12'}});
 fireEvent.change(screen.getByLabelText('Width (inches)'),{target:{value:'6'}});
 fireEvent.change(screen.getByLabelText('Length (feet)'),{target:{value:'10'}});
 expect(screen.getByText('125.0 sq.ft')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Save room'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Your measurements are still here');
 fireEvent.click(screen.getByRole('button',{name:'Save room'}));
 await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
 expect(save.mock.calls[0][0]).toMatchObject({width_ft:12.5,length_ft:10});
 expect(save.mock.calls[0][0].id).toBe(save.mock.calls[1][0].id);
});
it('does not save empty or invalid dimensions',async()=>{
 const save=jest.fn();render(<RoomFormSheet open onOpenChange={jest.fn()} room={null} onSave={save}/>);
 fireEvent.click(screen.getByRole('button',{name:'Save room'}));expect(await screen.findByRole('alert')).toHaveTextContent('positive width and length');expect(save).not.toHaveBeenCalled();
});
it('asks before discarding unsaved tape measurements',async()=>{
 const close=jest.fn();render(<RoomFormSheet open onOpenChange={close} room={null} onSave={jest.fn()}/>);
 fireEvent.change(screen.getByLabelText('Width (feet)'),{target:{value:'12'}});
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
 expect(screen.getByRole('alertdialog')).toBeVisible();expect(close).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));expect(screen.getByLabelText('Width (feet)')).toHaveValue('12');
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}));fireEvent.click(screen.getByRole('button',{name:'Discard changes'}));
 expect(close).toHaveBeenCalledWith(false);
});
