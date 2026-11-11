"use client";
import { Check, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROOM_SUGGESTIONS, getRoomSuggestions } from '@/lib/roomSuggestions';
import { TypeChoicePicker } from './TypeChoicePicker';

export function RoomPicker({ value, onChange }: { value: string; onChange: (room: string) => void }) {
 return <TypeChoicePicker value={value} onChange={onChange} options={Object.entries(ROOM_SUGGESTIONS).map(([room,items])=>({value:room,detail:items.length+' essentials'}))} label="Select room" heading="Rooms & spaces" searchPlaceholder="Search or type a room name..." trigger={open=><Button type="button" variant="outline" role="combobox" aria-label="Select room" aria-expanded={open} className="h-11 shrink-0 gap-2 rounded-lg border-primary/20 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10 sm:text-sm"><span>Select room</span><ChevronDown className="h-4 w-4" /></Button>} />;
}

export function RoomItemSuggestions({ room, selectedItems, onAdd }: { room: string; selectedItems: string[]; onAdd: (name: string) => void }) {
  const suggestions = getRoomSuggestions(room);
  if (!suggestions.length) return null;
  return <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 sm:p-4">
    <p className="text-sm font-semibold">Suggested items</p>
    <p className="mb-3 mt-1 text-xs text-muted-foreground">Select an item to add its quotation fields.</p>
    <div className="flex flex-wrap gap-2">
      {suggestions.map(name => {
        const added = selectedItems.some(item => item.trim().toLowerCase() === name.toLowerCase());
        return <Button type="button" key={name} variant="outline" size="sm" disabled={added} onClick={() => onAdd(name)} className="h-auto max-w-full gap-1.5 whitespace-normal rounded-full bg-background px-3 py-2 text-xs disabled:opacity-60">
          {added ? <Check className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}{name}
        </Button>;
      })}
    </div>
  </div>;
}
