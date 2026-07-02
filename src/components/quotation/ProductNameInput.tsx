import React, { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, Package, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';

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
  currencySymbol?: string;
  areaUnitShort?: string;
}

export const ProductNameInput: React.FC<ProductNameInputProps> = ({
  value,
  onChange,
  onProductSelect,
  patterns,
  placeholder = 'Product name',
  className,
  currencySymbol,
  areaUnitShort,
}) => {
  const { settings, formatCurrency } = useLocalization();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use props if provided, otherwise use localization settings
  const symbol = currencySymbol || settings.currencySymbol;
  const areaUnit = areaUnitShort || settings.areaUnitShort.toLowerCase();

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
    <div ref={containerRef} className={cn("relative", open && "z-50")}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => patterns.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn("h-10", className)}
      />
      {open && filteredProducts.length > 0 && (
        <div
          className="absolute top-full left-0 z-50 mt-1.5 w-max min-w-full max-w-[360px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
        >
          <Command>
            <CommandList className="max-h-64">
              <CommandGroup heading="Recent & Popular">
                {filteredProducts.map((pattern, index) => (
                  <CommandItem
                    key={`${pattern.product_name}-${index}`}
                    value={pattern.product_name}
                    onSelect={() => handleSelect(pattern)}
                    className="cursor-pointer rounded-lg py-2.5 px-2 gap-2 aria-selected:bg-accent/60"
                  >
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pattern.product_name}</p>
                      {pattern.preferred_rate && pattern.preferred_rate > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {symbol}{pattern.preferred_rate.toLocaleString(settings.locale)}/{areaUnit}
                        </p>
                      )}
                    </div>
                    {pattern.usage_count > 1 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                        <TrendingUp className="h-3 w-3" />
                        {pattern.usage_count}
                      </span>
                    )}
                    {value === pattern.product_name && (
                      <Check className="ml-1 h-4 w-4 text-primary shrink-0" />
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
