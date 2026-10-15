'use client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { defaultRoomWork, roomWorkOptions, type RoomWork } from '@/lib/quotation-ai/room-work';
import type { PlanAnalysis, ProjectBrief } from '@/lib/quotation-ai/floor-plan';
import { YesNoQuestion } from './YesNoQuestion';

export function RoomWorkQuestions({ room, brief, onChange }: {
  room: PlanAnalysis['rooms'][number]; brief: ProjectBrief; onChange: (answer: RoomWork) => void;
}) {
  const answer = brief.roomWork?.find(row => row.roomName === room.name) ?? defaultRoomWork(room, brief.scope);
  const options = roomWorkOptions(room, brief.scope);
  return <div className="space-y-4">
    <div className="rounded-xl bg-muted p-3 text-sm leading-6"><strong>{room.name}</strong>
      <p>{room.widthFt && room.lengthFt ? `The plan shows ${room.widthFt} × ${room.lengthFt} ft.` : 'The plan does not confirm this room’s dimensions.'} A few yes/no choices will define the work for this room.</p>
      {room.notes && <p className="mt-1 text-xs text-muted-foreground">Plan observations: {room.notes}</p>}
    </div>
    <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">What should be included in {room.name}?</legend>
      {options.map(option => {
        const work = answer.items.find(item => item.key === option.key);
        return <div key={option.key} data-work-key={option.key} className={`rounded-xl border p-3 ${answer.decisions?.[option.key] === true ? 'border-primary/40 bg-primary/[0.025]' : ''}`}>
          <YesNoQuestion question={`Include ${option.name.toLowerCase()} in ${room.name}?`} value={answer.decisions?.[option.key] ?? null}
            hint={option.default ? 'Suggested for this room. Confirm whether you need it.' : undefined} onChange={include => {
            onChange({ ...answer, decisions: { ...answer.decisions, [option.key]: include }, items: include ? work ? answer.items : [...answer.items, { key: option.key, widthFt: null, heightFt: null,
              areaSqft: option.surface && ['printed','user'].includes(room.source) && room.widthFt && room.lengthFt ? Math.round(room.widthFt * room.lengthFt * 10000) / 10000 : null, details: '' }]
              : answer.items.filter(item => item.key !== option.key) });
          }} />
          {work && answer.decisions?.[option.key] === true && <details className="mt-3 rounded-lg bg-background p-2">
            <summary className="cursor-pointer text-xs font-medium">Add {option.name.toLowerCase()} measurements or requirements (optional)</summary>
            <div className="mt-2 space-y-2">
            <p className="text-xs leading-5 text-muted-foreground">{room.name}: {option.hint}</p>
            {option.unit === 'sqft' && <div className="grid grid-cols-2 gap-2">
              {option.surface ? <label className="col-span-2 space-y-1 text-xs">{option.name} coverage (sqft)<Input type="number" min="0.01" max="100000" step="any" value={work.areaSqft ?? ''} placeholder="Confirm coverage or leave pending" onChange={event => onChange({ ...answer, items: answer.items.map(item => item.key === work.key ? { ...item, areaSqft: event.target.value ? Number(event.target.value) : null } : item) })} /></label>
                : (['widthFt','heightFt'] as const).map((field, index) => <label key={field} className="space-y-1 text-xs">{option.name} {index ? option.key === 'countertop' ? 'depth' : 'height' : 'width / length'} (ft)<Input type="number" min="0.01" max="100000" step="any" value={work[field] ?? ''} placeholder="Unknown" onChange={event => onChange({ ...answer, items: answer.items.map(item => item.key === work.key ? { ...item, [field]: event.target.value ? Number(event.target.value) : null, areaSqft: null } : item) })} /></label>)}
            </div>}
            <label className="block space-y-1 text-xs">{option.name}: material, layout or requirements<Input value={work.details} maxLength={600} placeholder={`Details for ${room.name.toLowerCase()}'s ${option.name.toLowerCase()}`} onChange={event => onChange({ ...answer, items: answer.items.map(item => item.key === work.key ? { ...item, details: event.target.value } : item) })} /></label>
          </div></details>}
        </div>;
      })}
    </fieldset>
    <label className="block space-y-1 text-sm">Anything else to account for in {room.name}?<Textarea value={answer.notes} maxLength={1000} placeholder={`Existing items to retain, door/window clearances, or other requirements in ${room.name}`} onChange={event => onChange({ ...answer, notes: event.target.value })} /></label>
    <p className="text-xs leading-5 text-muted-foreground">Selected work stays in the quotation even if its measurements or prices are pending. Deselect work you do not need. Electrical and plumbing work needs separate unit pricing.</p>
  </div>;
}
