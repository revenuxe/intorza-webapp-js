import { fireEvent, render, screen } from '@testing-library/react';
import { useInlineFeedback } from './useInlineFeedback';

function Example() {
  const { toast, feedback } = useInlineFeedback();
  return <>{feedback}<button onClick={() => toast({ title: 'Save failed', description: 'Your draft is still available.', variant: 'destructive' })}>Save</button></>;
}

it('keeps failures accessible on the page until dismissed', () => {
  render(<Example />);
  fireEvent.click(screen.getByText('Save'));
  expect(screen.getByRole('alert')).toHaveTextContent('Your draft is still available.');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
