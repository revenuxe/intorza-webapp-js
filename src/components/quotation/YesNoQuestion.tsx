'use client';
import { useId } from 'react';

export function YesNoQuestion({ question, value, onChange, yes = 'Yes', no = 'No', hint }: {
  question: string; value: boolean | null; onChange: (value: boolean) => void;
  yes?: string; no?: string; hint?: string;
}) {
  const name = useId();
  return <fieldset className="min-w-0 space-y-2">
    <legend className="text-sm font-semibold leading-6">{question}</legend>
    {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
    <div className="grid grid-cols-2 gap-2">{[{ answer: true, label: yes }, { answer: false, label: no }].map(option =>
      <label key={String(option.answer)} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm ${value === option.answer ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'bg-card'}`}>
        <input type="radio" name={name} checked={value === option.answer} onChange={() => onChange(option.answer)} className="shrink-0 accent-primary" />
        <span>{option.label}</span>
      </label>)}</div>
  </fieldset>;
}
