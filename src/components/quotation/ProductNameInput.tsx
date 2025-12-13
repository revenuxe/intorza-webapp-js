import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Package, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemPattern {
  product_name: string;
  product_details: string | null;
  preferred_rate: number | null;
  usage_count: number;
}

interface ProductNameInputProps {
  value: string;
  onChange: (name: string) => void;
  onProductSelect?: (pattern: ItemPattern) => void;
  patterns: ItemPattern[];
  placeholder?: string;
  className?: string;
}

export const ProductNameInput: React.FC<ProductNameInputProps> = ({
  value,
  onChange,
  onProductSelect,
  patterns,
  placeholder = 'Product name',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Filter and prioritize products
  const filteredProducts = useMemo(() => {
    if (!inputValue) {
      // Show top used products when empty
      return patterns.slice(0, 8);
    }
    const term = inputValue.toLowerCase();
    return patterns
      .filter(p => p.product_name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [patterns, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    if (newValue && !open && patterns.length > 0) {
      setOpen(true);
    }
  };

  const handleSelect = (pattern: ItemPattern) => {
    setInputValue(pattern.product_name);
    onChange(pattern.product_name);
    onProductSelect?.(pattern);
    setOpen(false);
  };

  // Sync external value changes
  React.useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => patterns.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={className}
        />
      </PopoverTrigger>
      {filteredProducts.length > 0 && (
        <PopoverContent className="w-64 p-0 bg-popover" align="start">
          <Command>
            <CommandList>
              <CommandEmpty>Type to search or add new item</CommandEmpty>
              <CommandGroup heading="Recent & Popular Items">
                {filteredProducts.map((pattern, index) => (
                  <CommandItem
                    key={`${pattern.product_name}-${index}`}
                    value={pattern.product_name}
                    onSelect={() => handleSelect(pattern)}
                    className="cursor-pointer"
                  >
                    <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pattern.product_name}</p>
                      {pattern.preferred_rate && pattern.preferred_rate > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ₹{pattern.preferred_rate.toLocaleString('en-IN')}/sft
                        </p>
                      )}
                    </div>
                    {pattern.usage_count > 1 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {pattern.usage_count}
                      </span>
                    )}
                    {value === pattern.product_name && (
                      <Check className="ml-1 h-4 w-4 text-primary" />
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
