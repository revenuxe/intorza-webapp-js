'use client';
import { scopedRooms, type PlanAnalysis, type ProjectBrief } from '@/lib/quotation-ai/floor-plan';
import { YesNoQuestion } from './YesNoQuestion';

export function PlanScopeQuestions({ analysis, brief, wholePlan, scopes, onWholePlan, onChange }: {
  analysis: PlanAnalysis; brief: ProjectBrief; wholePlan: boolean | null;
  scopes: readonly { value: ProjectBrief['scope']; title: string; detail: string }[];
  onWholePlan: (value: boolean) => void; onChange: (value: ProjectBrief) => void;
}) {
  const allNames = analysis.rooms.map(room => room.name);
  const offered = scopes.filter(scope => scope.value !== 'complete' && (scope.value === 'selected'
    || scopedRooms(analysis, { scope: scope.value, roomNames: allNames }).length > 0));
  const available = brief.scope === 'selected' ? analysis.rooms : scopedRooms(analysis, { ...brief, roomNames: allNames });
  return <div className="space-y-5">
    <YesNoQuestion question="Is the interior work for the whole floor plan?" value={wholePlan}
      yes="Yes, the whole plan" no="No, select rooms"
      hint={`Your plan contains ${analysis.rooms.length} room${analysis.rooms.length === 1 ? '' : 's'}. We’ll confirm the features you need in each included room next.`}
      onChange={value => {
        onWholePlan(value);
        onChange({ ...brief, scope: value ? 'complete' : 'selected', roomNames: value ? allNames : wholePlan === false ? brief.roomNames : [] });
      }} />
    {wholePlan === true && <div className="rounded-xl bg-muted p-3 text-sm leading-6"><p className="font-medium">All rooms are included</p><p className="text-muted-foreground">{allNames.join(', ')}</p><p className="mt-2 text-xs">Whole-home coverage does not mean every feature is mandatory. Next, choose Yes or No for cabinetry, storage, ceilings and other work in each room.</p></div>}
    {wholePlan === false && <>
      <div><p className="mb-2 text-sm font-semibold">Which rooms would you like to include?</p><p className="mb-3 text-xs text-muted-foreground">Select rooms directly, or start with a focused scope.</p>
        <div className="grid grid-cols-2 gap-2">{offered.map(scope => <button type="button" key={scope.value} aria-pressed={brief.scope === scope.value}
          onClick={() => onChange({ ...brief, scope: scope.value, roomNames: scope.value === 'selected' ? brief.roomNames : scopedRooms(analysis, { scope: scope.value, roomNames: allNames }).map(room => room.name) })}
          className={`rounded-xl border p-3 text-left ${brief.scope === scope.value ? 'border-primary bg-primary/5' : 'bg-card'}`}>
          <span className="block text-sm font-medium">{scope.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{scope.detail}</span>
        </button>)}</div>
      </div>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Rooms to include</legend>{available.map(room =>
        <label key={room.name} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm">
          <input type="checkbox" checked={brief.roomNames.includes(room.name)} onChange={event => onChange({ ...brief,
            roomNames: event.target.checked ? [...brief.roomNames, room.name] : brief.roomNames.filter(name => name !== room.name) })} />
          <span>{room.name}<span className="ml-2 text-xs text-muted-foreground">{room.widthFt && room.lengthFt ? `${room.widthFt} × ${room.lengthFt} ft` : room.kind}</span></span>
        </label>)}</fieldset>
      <p className="text-xs text-muted-foreground">{scopedRooms(analysis, brief).length} of {analysis.rooms.length} rooms selected. We’ll ask only about these rooms.</p>
    </>}
  </div>;
}
