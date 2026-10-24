import { render, screen, within } from '@testing-library/react';
import { FloorPlanEstimateOverview } from './FloorPlanEstimateOverview';
import { buildEstimate } from '@/lib/quotation-ai/floor-plan';
import { briefFixture, draftFixture, planFixture, proposalFixture } from '@/test/floor-plan-fixtures';

it('shows width, height and area together for an AI item', () => {
  const estimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  Object.assign(estimate.draft.sections[0].items[0], { measurementMode: 'dimensions', widthFt: 23, heightFt: 10, sftArea: null });
  render(<FloorPlanEstimateOverview estimate={estimate} />);
  const item = within(screen.getByRole('article'));
  expect(item.getByText('Width (ft)')).toBeVisible();
  expect(item.getByText('Height (ft)')).toBeVisible();
  expect(item.getByText('Area (sq ft)')).toBeVisible();
  expect(item.getByText('23')).toBeVisible();
  expect(item.getByText('10')).toBeVisible();
  expect(item.getByText('230')).toBeVisible();
});
it('converts dimension and area labels and values for metric review', () => {
  const estimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  Object.assign(estimate.draft.sections[0].items[0], { measurementMode: 'dimensions', widthFt: 10, heightFt: 5, sftArea: null });
  render(<FloorPlanEstimateOverview estimate={estimate} inputUnit="metres" />);
  expect(screen.getByText('Width (m)')).toBeVisible();
  expect(screen.getByText('Height (m)')).toBeVisible();
  expect(screen.getByText('Area (sq m)')).toBeVisible();
  expect(screen.getByText('3.048')).toBeVisible();
  expect(screen.getByText('1.524')).toBeVisible();
  expect(screen.getByText('4.6452')).toBeVisible();
});
it('keeps unknown dimensions pending when AI supplied only area', () => {
  const estimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  render(<FloorPlanEstimateOverview estimate={estimate} />);
  const measurements = screen.getByText('Width (ft)').closest('dl')!;
  expect(within(measurements).getAllByText('Pending')).toHaveLength(2);
  expect(within(measurements).getByText('56')).toBeVisible();
});
