import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PlanScopeQuestions } from './PlanScopeQuestions';
import { RoomWorkQuestions } from './RoomWorkQuestions';
import { defaultRoomWork } from '@/lib/quotation-ai/room-work';
import { planFixture, briefFixture } from '@/test/floor-plan-fixtures';
import type { ProjectBrief } from '@/lib/quotation-ai/floor-plan';
const rooms = [planFixture().rooms[0], { ...planFixture().rooms[0], name: 'Living Room', kind: 'living' as const }, { ...planFixture().rooms[0], name: 'Kitchen', kind: 'kitchen' as const }];
const scopes = [{ value: 'complete' as const, title: 'Full Interior', detail: 'All rooms' }, { value: 'kitchen' as const, title: 'Kitchen', detail: 'Kitchen only' }, { value: 'selected' as const, title: 'Choose specific rooms', detail: 'Select rooms' }];
function ScopeHarness() {
  const [brief, setBrief] = useState<ProjectBrief>({ ...briefFixture(), roomNames: rooms.map(room => room.name) });
  const [whole, setWhole] = useState<boolean | null>(null);
  return <><PlanScopeQuestions analysis={{ ...planFixture(), rooms }} brief={brief} wholePlan={whole} scopes={scopes} onWholePlan={setWhole} onChange={setBrief} /><output>{JSON.stringify(brief.roomNames)}</output></>;
}
it('asks about the whole plan first and clears assumed room selection when the answer is No', () => {
  render(<ScopeHarness />);
  expect(screen.queryByRole('checkbox')).toBeNull();
  fireEvent.click(screen.getByRole('radio', { name: 'No, select rooms' }));
  expect(screen.getByRole('checkbox', { name: /Living Room/ })).not.toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: /Living Room/ }));
  expect(screen.getByRole('status')).toHaveTextContent('["Living Room"]');
  expect(screen.getByText('1 of 3 rooms selected. We’ll ask only about these rooms.')).toBeVisible();
});
it('selects the entire detected plan on Yes and supports focused scopes on No', () => {
  render(<ScopeHarness />);
  fireEvent.click(screen.getByRole('radio', { name: 'Yes, the whole plan' }));
  expect(screen.getByText('All rooms are included')).toBeVisible();
  fireEvent.click(screen.getByRole('radio', { name: 'No, select rooms' }));
  fireEvent.click(screen.getByRole('button', { name: 'Kitchen Kitchen only' }));
  expect(screen.getByRole('status')).toHaveTextContent('["Kitchen"]');
  expect(screen.queryByRole('checkbox', { name: /Bedroom/ })).toBeNull();
});
it('requires an explicit TV cabinet answer and only includes confirmed living-room features', () => {
  function WorkHarness() {
    const room = rooms[1];
    const [brief, setBrief] = useState<ProjectBrief>({ ...briefFixture(), roomNames: [room.name], roomWork: [defaultRoomWork(room, 'complete')] });
    return <><RoomWorkQuestions room={room} brief={brief} onChange={answer => setBrief(current => ({ ...current, roomWork: [answer] }))} /><output>{brief.roomWork?.[0].items.map(item => item.key).join(',')}</output></>;
  }
  render(<WorkHarness />);
  const tv = screen.getByRole('group', { name: 'Include tv unit in Living Room?' });
  expect(within(tv).getByRole('radio', { name: 'Yes' })).not.toBeChecked();
  fireEvent.click(within(tv).getByRole('radio', { name: 'No' }));
  expect(screen.getByRole('status')).not.toHaveTextContent('tv_unit');
  expect(screen.queryByRole('group', { name: /wardrobe/i })).toBeNull();
  fireEvent.click(within(tv).getByRole('radio', { name: 'Yes' }));
  expect(screen.getByRole('status')).toHaveTextContent('tv_unit');
});
