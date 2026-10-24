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
  id?: string;
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
  id,
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
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = React.useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use props if provided, otherwise use localization settings
  const symbol = currencySymbol || settings.currencySymbol;
  const areaUnit = areaUnitShort || settings.areaUnitShort.toLowerCase();

  // Filter and prioritize products
  const filteredProducts = useMemo(() => {
    if (!inputValue.trim()) return [];
    const term = inputValue.toLowerCase();
    return patterns
      .filter(p => p.product_name.toLowerCase().includes(term))
      .slice(0, 40);
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
      if (!containerRef.current?.contains(document.activeElement) && !menuRef.current?.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 150);
  };

  // Sync external value changes
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  React.useEffect(() => { setActiveIndex(-1); }, [inputValue]);
  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && filteredProducts.length > 0}
        aria-controls={open && filteredProducts.length > 0 ? menuId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `${menuId}-${activeIndex}` : undefined}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); setActiveIndex(-1); }
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && filteredProducts.length) {
            event.preventDefault(); setOpen(true);
            const next = event.key === 'ArrowDown' ? Math.min(activeIndex + 1, filteredProducts.length - 1) : Math.max(activeIndex - 1, 0);
            setActiveIndex(next); document.getElementById(`${menuId}-${next}`)?.scrollIntoView({ block: 'nearest' });
          }
          if (event.key === 'Enter' && open && activeIndex >= 0 && filteredProducts[activeIndex]) { event.preventDefault(); handleSelect(filteredProducts[activeIndex]); }
        }}
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => inputValue.trim() !== '' && patterns.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
      />
      {open && inputValue.trim() !== '' && patterns.length > 0 && <div ref={menuRef} id={menuId} role="listbox" aria-label="Existing products" className="mt-1 flex max-h-56 flex-col overflow-hidden rounded-xl border bg-popover p-2 shadow-lg" onMouseDown={event => event.preventDefault()}>
        <div className="flex shrink-0 items-center justify-between px-2 pb-2 text-xs text-muted-foreground"><span>Existing products</span><span>{filteredProducts.length} {filteredProducts.length === 1 ? 'match' : 'matches'}</span></div>
        {filteredProducts.length ? <div className="min-h-0 space-y-1 overflow-y-auto overscroll-contain pr-1">{filteredProducts.map((pattern, index) => <button key={`${pattern.product_name}-${index}`} id={`${menuId}-${index}`} role="option" aria-selected={activeIndex === index} type="button" onClick={() => handleSelect(pattern)} className={cn("flex w-full items-start gap-2 rounded-lg border border-transparent p-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/5", activeIndex === index && "border-primary/30 bg-primary/5")}>
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted"><Package className="h-3.5 w-3.5 text-primary" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{pattern.product_name}</span>{pattern.product_details && <span className="mt-0.5 block overflow-hidden text-ellipsis text-xs leading-4 text-muted-foreground" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>{pattern.product_details}</span>}<span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{pattern.preferred_rate && pattern.preferred_rate > 0 && <span>{symbol}{pattern.preferred_rate.toLocaleString(settings.locale)}/{areaUnit}</span>}{pattern.usage_count > 1 && <span className="inline-flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{pattern.usage_count}</span>}</span></span>{value === pattern.product_name && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}</button>)}</div>
        : <p className="px-2 py-3 text-sm text-muted-foreground">No saved products match. Continue typing to add a new product.</p>}
      </div>}
    </div>
  );
};
