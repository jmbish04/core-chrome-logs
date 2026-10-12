import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/utils";

export interface NumberFieldProps {
  label?: string;
  description?: string;
  error?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function NumberField({
  label,
  description,
  error,
  value,
  onChange,
  min = 1,
  max = 9999,
  step = 1,
  id,
  className,
  disabled = false,
}: NumberFieldProps) {
  const handleDecrement = () => {
    if (disabled) return;
    const next = Math.max(min, (value || 0) - step);
    onChange(next);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const next = Math.min(max, (value || 0) + step);
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(min);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-foreground select-none block"
        >
          {label}
        </label>
      )}

      <div className="flex items-center gap-1">
        <div className="relative flex items-center w-full max-w-[200px] rounded-lg border border-border bg-background focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-colors">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className="flex h-8 w-8 items-center justify-center rounded-l-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Decrement"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <input
            type="number"
            id={id}
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={handleInputChange}
            className="h-8 w-full bg-transparent px-2 text-center text-xs font-mono font-medium text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            className="flex h-8 w-8 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Increment"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {description && (
        <p className="text-[11px] text-muted-foreground select-none leading-relaxed">
          {description}
        </p>
      )}
      {error && (
        <p className="text-[10px] text-destructive font-medium select-none">
          {error}
        </p>
      )}
    </div>
  );
}
