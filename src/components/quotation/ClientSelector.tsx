import React, { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  address: string | null;
}

interface ClientSelectorProps {
  value: string;
  onChange: (name: string) => void;
  onClientSelect?: (client: Client) => void;
  clients: Client[];
  placeholder?: string;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  value,
  onChange,
  onClientSelect,
  clients,
  placeholder = 'Enter or select client name',
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredClients = useMemo(() => {
    if (!inputValue) return clients.slice(0, 10);
    const term = inputValue.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(term)).slice(0, 10);
  }, [clients, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setActiveIndex(-1);
    if (newValue && !open) setOpen(true);
  };

  const handleSelect = (client: Client) => {
    setInputValue(client.name);
    onChange(client.name);
    onClientSelect?.(client);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filteredClients.length === 0) {
      if (e.key === 'ArrowDown' && clients.length > 0) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filteredClients.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredClients[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }, 150);
  };

  React.useEffect(() => {
    if (activeIndex < 0) return;
    const el = listRef.current?.querySelectorAll('[data-idx]')[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const [dropUp, setDropUp] = useState(false);
  React.useEffect(() => {
    if (!open) return;
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setDropUp(spaceBelow < 280 && spaceAbove > spaceBelow);
  }, [open, filteredClients.length]);

  return (
    <div ref={containerRef} className={cn("relative", open && "z-50")}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => clients.length > 0 && setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="none"
          aria-controls="client-selector-listbox"
          aria-activedescendant={activeIndex >= 0 ? `client-opt-${activeIndex}` : undefined}
          className="pr-9 h-10"
        />
        {clients.length > 0 && (
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
      </div>
      {open && filteredClients.length > 0 && (
        <div
          ref={listRef}
          id="client-selector-listbox"
          role="listbox"
          className={cn(
            "absolute left-0 z-50 w-[320px] max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl shadow-xl overflow-hidden",
            dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredClients.map((client, index) => {
              const active = index === activeIndex;
              return (
                <div
                  key={client.id}
                  id={`client-opt-${index}`}
                  data-idx={index}
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(client); }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer rounded-lg py-2.5 px-2 text-sm",
                    active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                  )}
                >
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    {client.address && (
                      <p className="text-[11px] text-muted-foreground truncate">{client.address}</p>
                    )}
                  </div>
                  {value === client.name && (
                    <Check className="ml-2 h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
