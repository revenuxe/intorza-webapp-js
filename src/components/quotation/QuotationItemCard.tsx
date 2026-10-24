'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQuotationUnit } from '@/lib/quotationUnits';

type Item = { id: string; productName: string; measurementUnit?: string; sftArea: number; ratePerSft: number; amount: number };
export function QuotationItemCard({ item, index, pending, activeItemId, collapseExceptItemId = null, onActivate, currencySymbol, locale, actions, children }: {
  collapseExceptItemId?: string | null;
  item: Item; index: number; pending: boolean; activeItemId: string | null; onActivate: () => void;
  currencySymbol: string; locale: string; actions: ReactNode; children: ReactNode;
}) {
  const complete = !!item.productName.trim() && item.sftArea > 0 && item.ratePerSft > 0 && !pending;
  const [open, setOpen] = useState(!complete);
  const bodyId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  // Close finished work when the designer moves to another item. Never close
  // an item just because its last price digit made it complete.
  useEffect(() => { if (activeItemId !== null && activeItemId !== item.id && complete) setOpen(false); }, [activeItemId, item.id, complete]);
  // Adding a room/item collapses all previous cards, including unfinished work.
  useEffect(() => { if (collapseExceptItemId !== null && collapseExceptItemId !== item.id) setOpen(false); }, [collapseExceptItemId, item.id]);
  const money = (value: number) => currencySymbol + value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <article className="min-w-0 max-w-full rounded-xl border border-border bg-muted/30 p-4 sm:p-5" aria-label={`Item ${index + 1}: ${item.productName || 'New item'}`}>
    <div className="flex items-start gap-2">
      <button ref={toggle} type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => { setOpen(current => !current); onActivate(); }} className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <p className="min-w-0 flex-1 break-words text-sm font-semibold">{index + 1}. {item.productName || 'New item'}</p>
        <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="flex shrink-0 gap-1">{actions}</div>
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs"><span className="text-muted-foreground">{item.sftArea > 0 ? `${item.sftArea.toLocaleString(locale)} ${getQuotationUnit(item.measurementUnit)} x ${money(item.ratePerSft)}` : 'Add measurements and rate'}</span><span className="ml-auto text-sm font-semibold tabular-nums text-primary">{pending ? 'Pending' : money(item.amount)}</span></div>
    <div id={bodyId} hidden={!open} className="space-y-4 pt-4" onFocusCapture={onActivate}>
      {children}
      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={() => { setOpen(false); toggle.current?.focus(); }}><Check className="h-3.5 w-3.5" />{complete ? 'Done - collapse item' : 'Collapse item'}</Button>
    </div>
  </article>;
}
