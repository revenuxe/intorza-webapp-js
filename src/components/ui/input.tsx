import * as React from "react";

import { cn } from "@/lib/utils";

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

// Keep editing text (including empty, .5 and 1.) separate from a parent's
// normalized calculation value. Native number inputs discard partial decimals.
const EditableNumberInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ value, defaultValue, onChange, onBlur, className, min, max, step: _step, type: _type, inputMode, placeholder, ...props }, ref) => {
    const [editing, setEditing] = React.useState<string | null>(null);
    const element = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => element.current!);
    const external = String(value ?? defaultValue ?? "");
    const numberOf = (text: string) => Number.isFinite(Number(text)) ? Number(text) : 0;
    const matches = editing !== null && (value === undefined || numberOf(external) === numberOf(editing));
    const display = matches ? editing : external;
    React.useEffect(() => {
      if (editing !== null && value !== undefined && !matches) setEditing(null);
    }, [value, editing, matches]);
    const validate = React.useCallback((element: HTMLInputElement) => {
      const raw = element.value;
      const numeric = Number(raw);
      const incomplete = raw !== "" && !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw);
      const outside = raw !== "" && !incomplete && ((min !== undefined && numeric < Number(min)) || (max !== undefined && numeric > Number(max)));
      element.setCustomValidity(incomplete ? "Enter a valid number." : outside ? `Enter a number${min !== undefined ? ` of at least ${min}` : ""}${max !== undefined ? ` up to ${max}` : ""}.` : "");
    }, [min, max]);
    React.useEffect(() => { if (element.current) validate(element.current); }, [display, validate]);
    return <input {...props} ref={element} type="text" inputMode={inputMode ?? "decimal"} placeholder={placeholder === '0' ? '' : placeholder} className={cn(inputClass, className)} value={display}
      onChange={event => {
        const raw = event.target.value;
        if (!/^-?\d*\.?\d*$/.test(raw) || (/\d/.test(raw) && !Number.isFinite(Number(raw)))) return;
        setEditing(raw); validate(event.currentTarget); onChange?.(event);
      }}
      onBlur={event => { validate(event.currentTarget); onBlur?.(event); }} />;
  },
);
EditableNumberInput.displayName = "EditableNumberInput";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    if (type === "number") return <EditableNumberInput {...props} type={type} className={className} ref={ref} />;
    return (
      <input
        type={type}
        className={cn(inputClass, type === "date" && "block box-border min-w-0 max-w-full appearance-none text-left [&::-webkit-date-and-time-value]:min-h-[1.5em] [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:inline-flex [&::-webkit-datetime-edit]:p-0", className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
