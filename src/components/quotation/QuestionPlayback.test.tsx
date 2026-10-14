import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuestionPlayback } from './QuestionPlayback';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }) } } }));
const player = { play: jest.fn(), pause: jest.fn(), removeAttribute: jest.fn(), setAttribute: jest.fn(), onended: null as null | (() => void), onerror: null };
beforeEach(() => { jest.clearAllMocks(); player.play.mockResolvedValue(undefined); Object.defineProperty(window, 'Audio', { configurable: true, value: jest.fn(() => player) }); global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['mp3']) }); });
it('provides a user-gesture replay if mobile autoplay is blocked, without paying again', async () => {
  player.play.mockRejectedValueOnce(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' }));
  render(<QuestionPlayback text="ग्राहक का नाम टाइप कीजिए।" language="hi-IN" onStart={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Read question' })); await screen.findByRole('button', { name: 'Play question' });
  fireEvent.click(screen.getByRole('button', { name: 'Play question' })); await screen.findByRole('button', { name: 'Stop reading' }); expect(fetch).toHaveBeenCalledTimes(1);
  act(() => player.onended?.()); await screen.findByRole('button', { name: 'Read question' });
  fireEvent.click(screen.getByRole('button', { name: 'Read question' })); await waitFor(() => expect(player.play).toHaveBeenCalledTimes(3)); expect(fetch).toHaveBeenCalledTimes(1);
});
it('cancels a pending read on unmount without starting audio', async () => {
  let finish!: (value: unknown) => void; (fetch as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<QuestionPlayback text="Customer name?" language="en-IN" onStart={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Read question' })); await waitFor(() => expect(fetch).toHaveBeenCalled()); view.unmount();
  await act(async () => finish({ ok: true, blob: async () => new Blob(['mp3']) })); expect(player.play).not.toHaveBeenCalled();
});
it('stops playback when the page is hidden', async () => {
  render(<QuestionPlayback text="Customer name?" language="en-IN" onStart={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Read question' })); await screen.findByRole('button', { name: 'Stop reading' });
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(player.pause).toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Read question' })).toBeInTheDocument();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
