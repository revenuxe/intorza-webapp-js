import { act, fireEvent, render, screen } from '@testing-library/react';
import { useQuotationDelivery } from './useQuotationDelivery';
import type { QuotationDelivery } from '@/lib/quotation-ai/delivery';

const projectId = '11111111-1111-4111-8111-111111111111';
const receipt: QuotationDelivery = { projectId, amount: 40, paid: false, ready: true };
const token = jest.fn(async () => 'session');
const onConfirmed = jest.fn();
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
function Harness({ value = receipt, visible = true }: { value?: QuotationDelivery; visible?: boolean }) {
  const billing = useQuotationDelivery({ receipt: value, visible, token, onConfirmed });
  return <><p>Quotation price: 1000</p><p>{billing.state}</p><p>{billing.error}</p><button onClick={billing.retry}>Retry confirmation</button></>;
}
const success = () => ({ ok: true, json: async () => ({ projectId, amount: 40, paid: true, balance: 20 }) });
beforeEach(() => {
  jest.clearAllMocks(); frames.clear(); nextFrame = 0;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id=++nextFrame; frames.set(id,callback); return id; });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
  global.fetch = jest.fn().mockResolvedValue(success());
});
afterEach(() => jest.restoreAllMocks());
async function paintFrame() {
  const pending=[...frames.values()]; frames.clear();
  await act(async () => { for (const callback of pending) await callback(0); });
}

it('confirms only after the price has rendered and two display frames have passed', async () => {
  render(<Harness />);
  expect(screen.getByText('Quotation price: 1000')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  await paintFrame(); expect(fetch).not.toHaveBeenCalled();
  await paintFrame();
  expect(fetch).toHaveBeenCalledWith('/api/quotation-ai/floor-plan',expect.objectContaining({ body: JSON.stringify({ action:'confirm_delivery',projectId }) }));
  expect(onConfirmed).toHaveBeenCalledWith(20);
  expect(screen.getByText('confirmed')).toBeInTheDocument();
});
it('keeps the shown price on a network failure and retries the same receipt without regenerating', async () => {
  (fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection lost; confirmation pending.'));
  render(<Harness />); await paintFrame(); await paintFrame();
  expect(screen.getByText('Quotation price: 1000')).toBeInTheDocument();
  expect(screen.getByText('error')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Retry confirmation'}));
  await paintFrame(); await paintFrame();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect((fetch as jest.Mock).mock.calls.map(([,options])=>options.body)).toEqual([JSON.stringify({action:'confirm_delivery',projectId}),JSON.stringify({action:'confirm_delivery',projectId})]);
  expect(screen.getByText('confirmed')).toBeInTheDocument();
});
it('does not confirm when the quote is closed before it paints', async () => {
  const view=render(<Harness />); view.unmount();
  await paintFrame(); await paintFrame(); expect(fetch).not.toHaveBeenCalled();
});
it.each([{...receipt,ready:false},{...receipt,paid:true}])('never charges incomplete or already-paid results', async value => {
  render(<Harness value={value}/>); await paintFrame(); await paintFrame();
  expect(fetch).not.toHaveBeenCalled();
});
it('does not confirm while analysis or another screen is shown', async () => {
  render(<Harness visible={false}/>); await paintFrame(); await paintFrame();
  expect(fetch).not.toHaveBeenCalled();
});
