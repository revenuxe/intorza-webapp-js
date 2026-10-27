import { Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Json } from '@/integrations/supabase/types';

export type AISelections = { brief: Json | null; property_type: string | null };
const scopes: Record<string, string> = {
  complete: 'Full interior', modular: 'Modular interiors', kitchen: 'Kitchen', bedrooms: 'Bedrooms',
  'kitchen-wardrobes': 'Kitchen & wardrobes', 'living-bedrooms': 'Living room & bedrooms', selected: 'Selected rooms',
};
const object = (value: Json | undefined): Record<string, Json | undefined> => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const text = (value: Json | undefined) => typeof value === 'string' ? value : '';
const label = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

export function QuotationAIBadge({ selections, quotationNumber }: { selections: AISelections; quotationNumber: string }) {
  const brief = object(selections.brief);
  const rows: [string, string][] = [
    ['Scope', scopes[text(brief.scope)] || text(brief.scope) || 'Not recorded'],
    ['Property', selections.property_type || ''],
    ['Rooms', Array.isArray(brief.roomNames) ? brief.roomNames.filter(value => typeof value === 'string').join(', ') : ''],
    ['Finish', text(brief.finish)],
    ['Location', text(brief.location)],
    ['Budget', typeof brief.budget === 'number' ? brief.budget.toLocaleString() : ''],
    ['Measurement units', text(brief.measurementInputUnit)],
  ];
  const kitchen = object(brief.kitchenPreferences);
  for (const [key, value] of Object.entries(kitchen)) {
    if (typeof value === 'string' && value) rows.push([`Kitchen ${label(key)}`, value === 'unknown' ? 'Not sure' : label(value)]);
  }
  if (Array.isArray(brief.roomWork)) for (const entry of brief.roomWork) {
    const room = object(entry);
    const items = Array.isArray(room.items) ? room.items.map(item => label(text(object(item).key))).filter(Boolean) : [];
    if (items.length) rows.push([text(room.roomName) || 'Room work', items.join(', ')]);
  }
  const design = object(brief.design);
  if (Array.isArray(brief.workExclusions)) for (const entry of brief.workExclusions) {
    const row = object(entry);
    if (Array.isArray(row.workKeys)) rows.push([`Excluded · ${text(row.roomName)}`, row.workKeys.map(value => label(text(value))).filter(Boolean).join(', ')]);
  }
  if (typeof design.coordinatedLook === 'boolean') rows.push(['Finishes', design.coordinatedLook ? 'Coordinated look' : 'Room-specific finishes']);
  if (typeof design.retainExisting === 'boolean') rows.push(['Existing items', design.retainExisting ? 'Retain where possible' : 'New interior work']);
  rows.push(['Design notes', text(design.notes)], ['Requirements', text(brief.requestNotes)]);
  if (Array.isArray(brief.quoteExtras)) rows.push(['Extras', brief.quoteExtras.map(value => label(text(value))).filter(Boolean).join(', ')]);

  return <Popover>
    <PopoverTrigger asChild>
      <button type="button" aria-label={`AI selections for ${quotationNumber}`} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
        <Sparkles className="h-3 w-3" aria-hidden="true" />AI
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-4">
      <h3 className="text-sm font-semibold">AI quotation selections</h3>
      <p className="mt-1 text-xs text-muted-foreground">{quotationNumber} · Saved builder choices</p>
      <dl className="mt-3 max-h-72 space-y-2.5 overflow-y-auto overscroll-contain text-xs">
        {rows.filter(([, value]) => value).map(([name, value], index) => <div key={`${name}-${index}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
          <dt className="text-muted-foreground">{name}</dt><dd className="whitespace-pre-wrap break-words leading-5">{value}</dd>
        </div>)}
      </dl>
    </PopoverContent>
  </Popover>;
}
