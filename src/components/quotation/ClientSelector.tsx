import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

  // Sync internal state when parent value changes (e.g., loading existing quotation)
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter clients based on input
  const filteredClients = useMemo(() => {
    if (!inputValue) return clients.slice(0, 10);
    const term = inputValue.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(term)).slice(0, 10);
  }, [clients, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    if (newValue && !open) {
      setOpen(true);
    }
  };

  const handleSelect = (client: Client) => {
    setInputValue(client.name);
    onChange(client.name);
    onClientSelect?.(client);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => clients.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="pr-8"
          />
          {clients.length > 0 && (
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      {filteredClients.length > 0 && (
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover" align="start">
          <Command>
            <CommandList>
              <CommandEmpty>No clients found.</CommandEmpty>
              <CommandGroup>
                {filteredClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.name}
                    onSelect={() => handleSelect(client)}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      {client.address && (
                        <p className="text-xs text-muted-foreground truncate">{client.address}</p>
                      )}
                    </div>
                    {value === client.name && (
                      <Check className="ml-2 h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
};
