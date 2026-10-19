import { fireEvent, render, screen } from '@testing-library/react';
import { useInlineFeedback } from './useInlineFeedback';

function Example({ autoRevealErrors = false, variant = 'destructive', focusTargetId = '' } = {}) {
  const { toast, feedback } = useInlineFeedback({ autoRevealErrors });
  return <>{feedback}<input id="clientName" aria-label="Client name" /><button onClick={() => toast({ title: 'Save failed', description: 'Your draft is still available.', variant, focusTargetId })}>Save</button></>;
}

describe('revealing quotation errors', () => {
  const scrollIntoView = jest.fn();
  beforeEach(() => {
    scrollIntoView.mockClear();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => jest.restoreAllMocks());

  it('reveals and focuses the missing client input instead of the notice', () => {
    render(<Example autoRevealErrors focusTargetId="clientName" />);
    fireEvent.click(screen.getByText('Save'));
    const input = screen.getByRole('textbox', { name: 'Client name' });
    expect(input).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'center' });
    expect(scrollIntoView.mock.instances[0]).toBe(input);
    fireEvent.click(screen.getByText('Save'));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('falls back to revealing the notice if the requested field is unavailable', () => {
    render(<Example autoRevealErrors focusTargetId="unavailable-field" />);
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('scrolls to and focuses an offscreen error on every failed attempt', () => {
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: -300, bottom: -200 } as DOMRect);
    render(<Example autoRevealErrors />);
    fireEvent.click(screen.getByText('Save'));
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }));
    expect(screen.getByRole('alert')).toHaveFocus();
    fireEvent.click(screen.getByText('Save'));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('leaves the screen still when the error is already visible', () => {
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 120, bottom: 240 } as DOMRect);
    render(<Example autoRevealErrors />);
    fireEvent.click(screen.getByText('Save'));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not scroll success messages or pages without auto reveal', () => {
    const { unmount } = render(<Example autoRevealErrors variant="success" />);
    fireEvent.click(screen.getByText('Save'));
    expect(scrollIntoView).not.toHaveBeenCalled();
    unmount();
    render(<Example />);
    fireEvent.click(screen.getByText('Save'));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

it('keeps failures accessible on the page until dismissed', () => {
  render(<Example />);
  fireEvent.click(screen.getByText('Save'));
  expect(screen.getByRole('alert')).toHaveTextContent('Your draft is still available.');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
