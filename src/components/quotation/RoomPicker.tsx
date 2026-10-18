"use client";

import { useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ROOM_SUGGESTIONS, getRoomSuggestions } from '@/lib/roomSuggestions';

export function RoomPicker({ value, onChange }: { value: string; onChange: (room: string) => void }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" role="combobox" aria-label="Select room" aria-expanded={open} className="h-9 shrink-0 gap-2 rounded-lg border-primary/20 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10 sm:text-sm">
        <span>Select room</span><ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-xl p-0 shadow-lg">
      <Command>
        <CommandInput placeholder="Search rooms…" />
        <CommandList>
          <CommandEmpty>No rooms found. You can type a custom room title.</CommandEmpty>
          <CommandGroup heading="Rooms & spaces">
            {Object.entries(ROOM_SUGGESTIONS).map(([room, items]) => <CommandItem key={room} value={room} onSelect={() => { onChange(room); setOpen(false); }} className="gap-2 py-3">
              <Check className={`h-4 w-4 shrink-0 ${value.trim().toLowerCase() === room.toLowerCase() ? 'opacity-100' : 'opacity-0'}`} />
              <span className="flex-1">{room}</span><span className="text-xs text-muted-foreground">{items.length} essentials</span>
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
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
