"use client";

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { teamProfessions, professionGroups } from '@/lib/team-professions';

export function ProfessionPicker({ value, onChange, id }: { value: string; onChange: (value: string) => void; id?: string }) {
  const [open, setOpen] = useState(false);
  const selected = teamProfessions.find(role => role.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} aria-label="Profession" className="w-full justify-between rounded-xl font-normal">
          <span className="truncate">{selected?.label || 'Select your profession'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl">
        <Command>
          <CommandInput placeholder="Search designer, carpenter, electrician..." aria-label="Search professions" />
          <CommandList className="max-h-64 overscroll-contain">
            <CommandEmpty>No matching profession. Try another term or choose Other.</CommandEmpty>
            {professionGroups.map(group => (
              <CommandGroup key={group} heading={group}>
                {teamProfessions.filter(role => role.group === group).map(role => (
                  <CommandItem key={role.value} value={role.label} keywords={[role.value, group]} onSelect={() => { onChange(role.value); setOpen(false); }} className="cursor-pointer py-2.5">
                    <span className="flex-1">{role.label}</span>
                    {value === role.value && <Check className="ml-2 h-4 w-4 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
