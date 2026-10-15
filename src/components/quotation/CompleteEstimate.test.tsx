import { fireEvent, render, screen } from '@testing-library/react';
import { CompleteEstimate } from './CompleteEstimate';
import { buildEstimate } from '@/lib/quotation-ai/floor-plan';
import { briefFixture, draftFixture, planFixture, proposalFixture } from '@/test/floor-plan-fixtures';
it('lets a user complete a pending item without regenerating or treating a budget as a price', () => {
  const proposal = proposalFixture(); proposal.sections[0].items[0].measurementStatus = 'unknown';
  const estimate = buildEstimate(proposal, planFixture(), briefFixture(), [], draftFixture());
  const onComplete = jest.fn(); const onRetry = jest.fn();
  render(<CompleteEstimate estimate={estimate} disabled={false} onComplete={onComplete} onRetry={onRetry} />);
  fireEvent.change(screen.getByLabelText('Front width / length (ft)'), { target: { value: '8' } });
  fireEvent.change(screen.getByLabelText('Front height (ft)'), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply details' }));
  expect(onComplete).toHaveBeenCalledWith({ itemId: estimate.draft.sections[0].items[0].id, widthFt: 8, heightFt: 7, ratePerSft: null });
  fireEvent.click(screen.getByRole('button', { name: 'Retry pricing only' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/not your project budget/)).toBeVisible();
});
