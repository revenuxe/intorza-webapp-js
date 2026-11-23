import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProjectDeadlinePicker } from './ProjectDeadlinePicker';

function Form() {
  const [deadline, setDeadline] = useState('2027-01-20');
  const [validTill, setValidTill] = useState('2026-12-13');
  return <>
    <ProjectDeadlinePicker value={deadline} proposalDate="2026-12-06" onChange={setDeadline} />
    <ProjectDeadlinePicker id="quotationValidTill" label="Quotation Valid Till" value={validTill} proposalDate="2026-12-06" onChange={setValidTill} />
    <output aria-label="Saved deadline">{deadline}</output>
    <output aria-label="Saved validity">{validTill}</output>
  </>;
}

it('updates and highlights custom dates and keeps Custom selected', () => {
  render(<Form />);
  fireEvent.change(screen.getByLabelText('Project Deadline'), { target: { value: 'custom' } });
  fireEvent.click(screen.getByRole('button', { name: /Wednesday, January 27th, 2027/i }));
  expect(screen.getByLabelText('Saved deadline')).toHaveTextContent('2027-01-27');
  expect(screen.getByRole('gridcell', { selected: true })).toHaveTextContent('27');
  expect(screen.getByLabelText('Project Deadline')).toHaveValue('custom');
  fireEvent.click(screen.getByRole('button', { name: /Wednesday, January 27th, 2027/i }));
  expect(screen.getByLabelText('Saved deadline')).toHaveTextContent('2027-01-27');
});

it('supports every preset independently for validity and deadline', () => {
  render(<Form />);
  for (const [days, date] of [[7, '2026-12-13'], [14, '2026-12-20'], [30, '2027-01-05'], [45, '2027-01-20']]) {
    fireEvent.change(screen.getByLabelText('Quotation Valid Till'), { target: { value: String(days) } });
    expect(screen.getByLabelText('Saved validity')).toHaveTextContent(String(date));
    expect(screen.getByLabelText('Quotation Valid Till')).toHaveValue(String(days));
  }
  expect(screen.getByLabelText('Saved deadline')).toHaveTextContent('2027-01-20');
  fireEvent.change(screen.getByLabelText('Quotation Valid Till'), { target: { value: 'custom' } });
  fireEvent.click(screen.getByRole('button', { name: /Friday, January 29th, 2027/i }));
  expect(screen.getByLabelText('Saved validity')).toHaveTextContent('2027-01-29');
});
