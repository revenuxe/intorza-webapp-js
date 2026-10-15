'use client';
import { YesNoQuestion } from './YesNoQuestion';
import { Textarea } from '@/components/ui/textarea';
import { scopedRooms, type PlanAnalysis, type ProjectBrief } from '@/lib/quotation-ai/floor-plan';

export function DesignIntentQuestions({ analysis, brief, onChange }: {
  analysis: PlanAnalysis; brief: ProjectBrief; onChange: (brief: ProjectBrief) => void;
}) {
  const rooms = scopedRooms(analysis, brief);
  const design = brief.design ?? { coordinatedLook: null, retainExisting: null, notes: '' };
  return <div className="space-y-5">
    <p className="text-sm leading-6 text-muted-foreground">Design direction for {rooms.map(room => room.name).join(', ')}. Your choices guide the material, storage and finish recommendations.</p>
    <YesNoQuestion question={rooms.length > 1 ? 'Would you like a coordinated design across these rooms?' : `Would you like coordinated cabinetry, colours and finishes in ${rooms[0]?.name || 'this room'}?`}
      value={design.coordinatedLook} hint="Match the selected cabinetry, feature walls and finishes while accounting for the plan’s doors, windows and circulation."
      onChange={value => onChange({ ...brief, design: { ...design, coordinatedLook: value } })} />
    <YesNoQuestion question="Should we retain existing furniture and finishes wherever possible?" value={design.retainExisting}
      hint="This helps distinguish new work from items you want to keep or refurbish."
      onChange={value => onChange({ ...brief, design: { ...design, retainExisting: value } })} />
    <label className="block space-y-2 text-sm">{design.retainExisting ? 'Which existing items should stay, and in which rooms?' : 'Any preferred colours, materials or design references? (optional)'}
      <Textarea value={design.notes} maxLength={600} placeholder={design.retainExisting ? `For example, retain existing wardrobes in ${rooms.find(room => room.kind === 'bedroom')?.name || rooms[0]?.name || 'the selected room'}.` : 'Describe your preferences, or leave this for the AI to recommend.'}
        onChange={event => onChange({ ...brief, design: { ...design, notes: event.target.value } })} />
    </label>
    <p className="rounded-xl bg-muted p-3 text-xs leading-5">Recommendations use the selected rooms, work and budget. Structural changes, opening positions and site measurements still need professional verification.</p>
  </div>;
}
