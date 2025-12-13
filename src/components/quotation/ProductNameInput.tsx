import React, { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter and prioritize products
  const filteredProducts = useMemo(() => {
    if (!inputValue) {
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
    if (newValue && patterns.length > 0) {
      setOpen(true);
    }
  };

  const handleSelect = (pattern: ItemPattern) => {
    setInputValue(pattern.product_name);
    onChange(pattern.product_name);
    onProductSelect?.(pattern);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay close to allow click on dropdown items
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 150);
  };

  // Sync external value changes
  React.useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => patterns.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
      />
      {open && filteredProducts.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg">
          <Command>
            <CommandList>
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
        </div>
      )}
    </div>
  );
};