import React, { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
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
  const { settings } = useLocalization();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const symbol = currencySymbol || settings.currencySymbol;
  const areaUnit = areaUnitShort || settings.areaUnitShort.toLowerCase();

  const filteredProducts = useMemo(() => {
    if (!inputValue) return patterns.slice(0, 8);
    const term = inputValue.toLowerCase();
    return patterns.filter(p => p.product_name.toLowerCase().includes(term)).slice(0, 8);
  }, [patterns, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setActiveIndex(-1);
    if (newValue && patterns.length > 0) setOpen(true);
  };

  const handleSelect = (pattern: ItemPattern) => {
    setInputValue(pattern.product_name);
    onChange(pattern.product_name);
    onProductSelect?.(pattern);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filteredProducts.length === 0) {
      if (e.key === 'ArrowDown' && patterns.length > 0) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredProducts[activeIndex]);
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
    if (value !== inputValue) setInputValue(value);
  }, [value]);

  React.useEffect(() => {
    if (activeIndex < 0) return;
    const el = listRef.current?.querySelectorAll('[data-idx]')[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div ref={containerRef} className={cn("relative", open && "z-50")}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => patterns.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="none"
        aria-controls="product-name-listbox"
        aria-activedescendant={activeIndex >= 0 ? `product-opt-${activeIndex}` : undefined}
        className={cn("h-10", className)}
      />
      {open && filteredProducts.length > 0 && (
        <div
          ref={listRef}
          id="product-name-listbox"
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1.5 w-[320px] max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
        >
          <div className="max-h-64 overflow-y-auto p-1">
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Recent & Popular
            </p>
            {filteredProducts.map((pattern, index) => {
              const active = index === activeIndex;
              return (
                <div
                  key={`${pattern.product_name}-${index}`}
                  id={`product-opt-${index}`}
                  data-idx={index}
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(pattern); }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer rounded-lg py-2.5 px-2 text-sm",
                    active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                  )}
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
