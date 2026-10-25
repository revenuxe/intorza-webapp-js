import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuickPlanScope } from './QuickPlanScope';
import { briefFixture, planFixture } from '@/test/floor-plan-fixtures';
import type { ProjectBrief } from '@/lib/quotation-ai/floor-plan';

it('collects kitchen preferences in the post-analysis flow and keeps them in the quotation brief', () => {
  function Harness() {
    const kitchen = { ...planFixture().rooms[0], name: 'Kitchen', kind: 'kitchen' as const };
    const analysis = { ...planFixture(), rooms: [kitchen] };
    const [brief, setBrief] = useState<ProjectBrief>({ ...briefFixture(), scope: 'modular', roomNames: ['Kitchen'] });
    return <><QuickPlanScope analysis={analysis} brief={brief} onChange={setBrief} onRoomChange={() => undefined} /><output>{JSON.stringify(brief.kitchenPreferences)}</output></>;
  }
  render(<Harness />);
  fireEvent.change(screen.getByLabelText('Kitchen layout'), { target: { value: 'l_shape' } });
  fireEvent.change(screen.getByLabelText('Kitchen carcass'), { target: { value: 'bwr_plywood' } });
  fireEvent.change(screen.getByLabelText('Kitchen appliance details'), { target: { value: 'Keep sink and hob in place.' } });
  expect(document.querySelector('output')?.textContent).toContain('"layout":"l_shape"');
  expect(document.querySelector('output')?.textContent).toContain('"carcass":"bwr_plywood"');
  expect(document.querySelector('output')?.textContent).toContain('Keep sink and hob in place');
});
