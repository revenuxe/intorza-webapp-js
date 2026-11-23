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

it('uses a plain date input for custom dates and returns to presets when cleared', () => {
  render(<Form />);
  fireEvent.change(screen.getByLabelText('Project Deadline'), { target: { value: 'custom' } });
  fireEvent.change(screen.getByLabelText('Project Deadline'), { target: { value: '2027-01-27' } });
  expect(screen.getByLabelText('Saved deadline')).toHaveTextContent('2027-01-27');
  expect(screen.getByLabelText('Project Deadline')).toHaveValue('2027-01-27');
  expect(screen.getByLabelText('Project Deadline')).toHaveAttribute('type', 'date');
  expect(screen.queryByRole('combobox', { name: 'Project Deadline' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Project Deadline')).toHaveValue('2027-01-27');
  fireEvent.change(screen.getByLabelText('Project Deadline'), { target: { value: '2027-01-20' } });
  expect(screen.getByLabelText('Project Deadline')).toHaveValue('2027-01-20');
  fireEvent.change(screen.getByLabelText('Project Deadline'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Project Deadline'), { target: { value: '14' } });
  expect(screen.getByLabelText('Project Deadline')).toHaveValue('14');
  expect(screen.getByLabelText('Saved deadline')).toHaveTextContent('2026-12-20');
  expect(screen.queryByLabelText('Project Deadline duration')).not.toBeInTheDocument();
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
  fireEvent.change(screen.getByLabelText('Quotation Valid Till'), { target: { value: '2027-01-29' } });
  expect(screen.getByLabelText('Saved validity')).toHaveTextContent('2027-01-29');
  expect(screen.getByLabelText('Quotation Valid Till')).toHaveValue('2027-01-29');
});
