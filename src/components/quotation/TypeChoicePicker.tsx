'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

type Choice = { value: string; detail?: string };

/** Mobile uses a viewport-contained sheet, so keyboard scrolling cannot detach
 * the list from its field. Desktop retains a bounded, collision-aware popover. */
export function TypeChoicePicker({ value, onChange, options, label, heading, searchPlaceholder, trigger }: {
  value: string; onChange: (value: string) => void; options: Choice[]; label: string;
  heading: string; searchPlaceholder: string; trigger: (open: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mobile, setMobile] = useState(false);
  const [viewport, setViewport] = useState<{ height: number; bottom: number } | null>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setMobile(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const update = () => {
      const view = window.visualViewport;
      setViewport({ height: (view?.height || window.innerHeight) - 16, bottom: Math.max(0, window.innerHeight - (view?.height || window.innerHeight) - (view?.offsetTop || 0)) });
    };
    update(); window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update);
    return () => { window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, [open, mobile]);
  const changeOpen = (next: boolean) => { setQuery(''); setOpen(next); };
  const choose = (next: string) => { const clean = next.trim(); if (!clean) return; onChange(clean); changeOpen(false); };
  const custom = query.trim();
  const choices = value.trim() && !options.some(option => option.value.toLowerCase() === value.trim().toLowerCase()) ? [{ value: value.trim(), detail: 'Current value' }, ...options] : options;
  const exact = choices.some(option => option.value.toLowerCase() === custom.toLowerCase());
  const content = <Command className="flex min-h-0 flex-1 flex-col rounded-xl">
    <CommandInput aria-label={label + ' search'} placeholder={searchPlaceholder} value={query} onValueChange={setQuery} maxLength={120} onKeyDown={event => {
      if (event.key === 'Enter' && custom && !exact) { event.preventDefault(); event.stopPropagation(); choose(custom); }
    }} />
    <CommandList className="min-h-0 max-h-none flex-1 overflow-y-auto overscroll-contain touch-pan-y">
      <CommandEmpty>No matches. Enter your own name and use it below.</CommandEmpty>
      <CommandGroup heading={heading}>{choices.map(option => <CommandItem key={option.value} value={option.value} className="min-h-11 cursor-pointer gap-2 py-3" onSelect={() => choose(option.value)}>
        <Check className={'h-4 w-4 shrink-0 text-primary ' + (value.trim().toLowerCase() === option.value.toLowerCase() ? '' : 'opacity-0')} aria-hidden="true" />
        <span className="min-w-0 flex-1 break-words">{option.value}</span>{option.detail && <span className="shrink-0 text-xs text-muted-foreground">{option.detail}</span>}
      </CommandItem>)}</CommandGroup>
    </CommandList>
    {custom && !exact && <div className="shrink-0 border-t p-2"><Button type="button" variant="outline" className="h-auto min-h-11 w-full justify-start gap-2 whitespace-normal text-left" onClick={() => choose(custom)}><Plus className="h-4 w-4 shrink-0" /><span className="break-words">Use “{custom}”</span></Button></div>}
  </Command>;
  if (mobile) return <Sheet open={open} onOpenChange={changeOpen}><SheetTrigger asChild>{trigger(open)}</SheetTrigger><SheetContent side="bottom" onOpenAutoFocus={event => event.preventDefault()} style={viewport ? { maxHeight: viewport.height, bottom: viewport.bottom } : undefined} className="flex h-[70dvh] max-h-[calc(100dvh-1rem)] min-h-0 flex-col gap-0 overflow-hidden rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]">
    <SheetHeader className="shrink-0 border-b px-4 py-4 pr-12 text-left"><SheetTitle>{label}</SheetTitle><SheetDescription>Choose an option or type your own name.</SheetDescription></SheetHeader>{content}
  </SheetContent></Sheet>;
  return <Popover open={open} onOpenChange={changeOpen}><PopoverTrigger asChild>{trigger(open)}</PopoverTrigger><PopoverContent side="bottom" align="end" collisionPadding={16} sticky="always" className="flex h-[22rem] max-h-[var(--radix-popover-content-available-height)] w-[min(380px,calc(100vw-2rem))] min-w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] flex-col overflow-hidden rounded-xl p-0 shadow-lg">{content}</PopoverContent></Popover>;
}
