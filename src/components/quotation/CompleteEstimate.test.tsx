import { fireEvent, render, screen } from '@testing-library/react';
import { CompleteEstimate } from './CompleteEstimate';
import { buildEstimate } from '@/lib/quotation-ai/floor-plan';
import { briefFixture, draftFixture, planFixture, proposalFixture } from '@/test/floor-plan-fixtures';
it('lets a user complete a pending item without regenerating or treating a budget as a price', () => {
  const proposal = proposalFixture(); proposal.sections[0].items[0].measurementStatus = 'unknown';
  const estimate = buildEstimate(proposal, planFixture(), briefFixture(), [], draftFixture());
  const onComplete = jest.fn(); const onRetry = jest.fn();
  render(<CompleteEstimate estimate={estimate} disabled={false} onComplete={onComplete} onRetry={onRetry} />);
  fireEvent.change(screen.getByLabelText('Work area (sqft)'), { target: { value: '56' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply details' }));
  expect(onComplete).toHaveBeenCalledWith({ itemId: estimate.draft.sections[0].items[0].id, widthFt: null, heightFt: null, areaSqft: 56, ratePerSft: null });
  fireEvent.click(screen.getByRole('button', { name: 'Retry pricing only' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/not your project budget/)).toBeVisible();
});
it('uses selected feet measurements to submit sqft without changing the per-sqft price', () => {
  const proposal = proposalFixture(); proposal.sections[0].items[0].measurementStatus = 'unknown';
  const estimate = buildEstimate(proposal, planFixture(), briefFixture(), [], draftFixture());
  const onComplete = jest.fn();
  render(<CompleteEstimate estimate={estimate} disabled={false} onComplete={onComplete} onRetry={jest.fn()} inputUnit="feet" />);
  fireEvent.change(screen.getByLabelText('Work width / length (feet)'), { target: { value: '8' } });
  fireEvent.change(screen.getByLabelText('Work height / depth (feet)'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Known selling rate per sqft (optional)'), { target: { value: '1200' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply details' }));
  expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ areaSqft: 56, widthFt: null, heightFt: null, ratePerSft: 1200 }));
});
