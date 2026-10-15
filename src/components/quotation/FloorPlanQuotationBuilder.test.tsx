import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FloorPlanQuotationBuilder } from './FloorPlanQuotationBuilder';
import { draftFixture } from '@/test/floor-plan-fixtures';
import { supabase } from '@/integrations/supabase/client';
import { buildEstimate } from '@/lib/quotation-ai/floor-plan';
import { briefFixture, planFixture, proposalFixture } from '@/test/floor-plan-fixtures';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('./ClientSelector', () => ({ ClientSelector: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => <input aria-label="Client name" value={value} onChange={event => onChange(event.target.value)} /> }));
const onApply = jest.fn();
const props = () => ({ mode: 'details' as const, onStart: jest.fn(), onClose: jest.fn(), getCurrentDraft: draftFixture, onApply, clients: [] });
beforeEach(() => {
  jest.clearAllMocks();
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: 'session' } } });
  global.fetch = jest.fn();
});
async function reachReview() {
  const view = render(<FloorPlanQuotationBuilder {...props()} mode={null} />);
  // The card initializes the no-plan path without making a paid request.
  fireEvent.click(screen.getByRole('button', { name: 'Built with AI' }));
  fireEvent.click(screen.getByRole('button', { name: 'Generate Quotation' }));
  view.rerender(<FloorPlanQuotationBuilder {...props()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add room' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Room 1 name' }), { target: { value: 'Bedroom' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Yes, the whole plan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  for (const group of screen.getAllByRole('group', { name: /^Include/ })) {
    const name = group.querySelector('legend')?.textContent || '';
    fireEvent.click(within(group).getByRole('radio', { name: /room storage|false ceiling|wall painting/.test(name) ? 'Yes' : 'No' }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(within(screen.getByRole('group', { name: /coordinated cabinetry/ })).getByRole('radio', { name: 'Yes' }));
  fireEvent.click(within(screen.getByRole('group', { name: /retain existing/ })).getByRole('radio', { name: 'No' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Client name' }), { target: { value: 'Rahul' } });
  fireEvent.change(screen.getByLabelText('Project city or location'), { target: { value: 'Bengaluru' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}
it('offers both entry paths without microphone controls or permission requests', () => {
  render(<FloorPlanQuotationBuilder {...props()} mode={null} />);
  expect(screen.queryByRole('button', { name: 'Upload Floor Plan' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Built with AI' }));
  expect(screen.getByRole('button', { name: 'Upload Floor Plan' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Generate Quotation' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /listen|speak|read question/i })).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});
it('asks contextual questions locally and preserves answers after a provider error', async () => {
  await reachReview();
  expect(screen.getByText('Ready to build your estimate')).toBeVisible();
  expect(global.fetch).not.toHaveBeenCalled();
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Please wait and retry.' }) });
  const buttons = screen.getAllByRole('button', { name: 'Generate Quotation' });
  fireEvent.click(buttons[buttons.length - 1]);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Please wait and retry.'));
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('textbox', { name: 'Client name' })).toHaveValue('Rahul');
  expect(screen.getByLabelText('Project city or location')).toHaveValue('Bengaluru');
});
it('requires an explicit review action before populating or saving a quotation', async () => {
  await reachReview();
  const estimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ estimate, projectId: 'project' }) });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Quotation' }));
  await screen.findByText('Your quotation is ready to review');
  expect(onApply).not.toHaveBeenCalled();
  expect(screen.getByText(/Partial total/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Save as Draft' }));
  expect(onApply).toHaveBeenCalledWith(estimate.draft, JSON.stringify(draftFixture()), 'project', true, estimate.evidence);
});
it('shows room-specific work choices and sends all confirmed fields in the generation request', async () => {
  await reachReview();
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Retry' }) });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Quotation' }));
  await screen.findByRole('alert');
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body.brief.roomWork[0]).toMatchObject({ roomName: 'Bedroom' });
  expect(body.brief.roomWork[0].items).toHaveLength(3);
  expect(body.brief.roomWork[0].items.map((item: { key: string }) => item.key)).toEqual(['storage','ceiling','painting']);
  expect(body.brief.design).toMatchObject({ coordinatedLook: true, retainExisting: false });
});
it('requires scope confirmation and directs the user to the first unanswered feature', async () => {
  render(<FloorPlanQuotationBuilder {...props()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add room' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Room 1 name' }), { target: { value: 'Living Room' } });
  fireEvent.change(screen.getByLabelText('Room type'), { target: { value: 'living' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whether the interior work covers the whole plan');
  fireEvent.click(screen.getByRole('radio', { name: 'No, select rooms' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Living Room/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Plan your Living Room interior' })).toHaveFocus());
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('alert')).toHaveTextContent('tv unit in Living Room');
  expect(within(screen.getByRole('group', { name: 'Include tv unit in Living Room?' })).getByRole('radio', { name: 'Yes' })).toHaveFocus();
  expect(global.fetch).not.toHaveBeenCalled();
});
