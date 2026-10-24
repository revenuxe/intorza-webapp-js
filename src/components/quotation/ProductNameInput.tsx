import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  
  // Use props if provided, otherwise use localization settings
  const symbol = currencySymbol || settings.currencySymbol;
  const areaUnit = areaUnitShort || settings.areaUnitShort.toLowerCase();

  // Filter and prioritize products
  const filteredProducts = useMemo(() => {
    if (!inputValue) {
      return patterns.slice(0, 40);
    }
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

  React.useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({ position: 'fixed', top: Math.min(rect.bottom + 6, window.innerHeight - 120), left: Math.max(8, rect.left), width: Math.min(Math.max(rect.width, 280), window.innerWidth - Math.max(16, rect.left + 8)), zIndex: 100 });
    };
    position();
    window.addEventListener('resize', position); window.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => patterns.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
      />
      {open && filteredProducts.length > 0 && typeof document !== 'undefined' && createPortal(<div style={menuStyle} className="rounded-xl border bg-popover p-2 shadow-xl" onMouseDown={event => event.preventDefault()}>
        <div className="flex items-center justify-between px-2 pb-2 text-xs text-muted-foreground"><span>Existing products</span><span>{filteredProducts.length} matches</span></div>
        <div className="max-h-72 space-y-1 overflow-y-auto overscroll-contain pr-1">{filteredProducts.map((pattern, index) => <button key={`${pattern.product_name}-${index}`} type="button" onClick={() => handleSelect(pattern)} className="flex w-full items-start gap-2 rounded-lg border border-transparent p-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted"><Package className="h-3.5 w-3.5 text-primary" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{pattern.product_name}</span>{pattern.product_details && <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">{pattern.product_details}</span>}<span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{pattern.preferred_rate && pattern.preferred_rate > 0 && <span>{symbol}{pattern.preferred_rate.toLocaleString(settings.locale)}/{areaUnit}</span>}{pattern.usage_count > 1 && <span className="inline-flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{pattern.usage_count}</span>}</span></span>{value === pattern.product_name && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}</button>)}</div>
      </div>, document.body)}
    </div>
  );
};
