import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FieldExplanation } from './FieldExplanation';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }) } } }));
jest.mock('./QuestionPlayback', () => ({ QuestionPlayback: () => <span>Question audio</span> }));
it('explains only the current field, displays English and caches repeated help', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ display: 'Enter width in feet, for example 6.5.', speech: 'चौड़ाई फीट में डालिए।' }) });
  const finish = jest.fn();
  render(<FieldExplanation step="widthFt" language="hi-IN" onStart={jest.fn()} onFinish={finish} />);
  fireEvent.click(screen.getByRole('button', { name: 'Explain simply' }));
  await screen.findByText('Enter width in feet, for example 6.5.');
  expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({ action: 'explain', step: 'widthFt', language: 'hi-IN' });
  fireEvent.click(screen.getByRole('button', { name: 'Back to question' })); expect(finish).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Explain simply' })); await screen.findByText('Enter width in feet, for example 6.5.'); expect(fetch).toHaveBeenCalledTimes(1);
});
it('aborts pending help when the field changes', async () => {
  global.fetch = jest.fn(() => new Promise(() => {}));
  const view = render(<FieldExplanation step="widthFt" language="en-IN" onStart={jest.fn()} onFinish={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Explain simply' })); await waitFor(() => expect(fetch).toHaveBeenCalled());
  const signal = (fetch as jest.Mock).mock.calls[0][1].signal;
  view.rerender(<FieldExplanation step="heightFt" language="en-IN" onStart={jest.fn()} onFinish={jest.fn()} />); expect(signal.aborted).toBe(true);
});
it('restores question controls when AI help fails', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ upstreamStatus: 429 }) });
  const finish = jest.fn();
  render(<FieldExplanation step="widthFt" language="en-IN" onStart={jest.fn()} onFinish={finish} />);
  fireEvent.click(screen.getByRole('button', { name: 'Explain simply' }));
  await screen.findByRole('alert'); expect(finish).toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Explain simply' })).toBeEnabled();
});
