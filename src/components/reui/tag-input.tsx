import React, { useState } from "react";
import { Badge } from "./badge";
import { Plus, Globe } from "lucide-react";
import { cn } from "../../lib/utils";

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  badgeVariant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "info"
    | "success"
    | "warning"
    | "primary-light"
    | "info-light"
    | "success-light"
    | "warning-light"
    | "destructive-light";
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function TagInput({
  tags = [],
  onChange,
  placeholder = "Add domain (e.g. github.com)...",
  badgeVariant = "outline",
  label,
  description,
  icon,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sanitize domain / tag input
  const sanitize = (raw: string): string => {
    let clean = raw.trim().toLowerCase();
    // Strip protocol
    if (clean.startsWith("http://")) clean = clean.slice(7);
    if (clean.startsWith("https://")) clean = clean.slice(8);
    // Strip trailing slashes or subpaths if domain
    if (clean.includes("/")) clean = clean.split("/")[0];
    return clean;
  };

  const handleAdd = (valueToAdd?: string) => {
    const val = valueToAdd || inputValue;
    if (!val.trim()) return;

    // Check for comma, newline, or space separated paste
    if (val.includes(",") || val.includes("\n") || val.includes(" ")) {
      const parts = val
        .split(/[,\s\n]+/)
        .map(sanitize)
        .filter(Boolean);

      const newTags = [...tags];
      for (const p of parts) {
        if (!newTags.includes(p)) {
          newTags.push(p);
        }
      }
      onChange(newTags);
      setInputValue("");
      setError(null);
      return;
    }

    const clean = sanitize(val);
    if (!clean) return;

    if (tags.includes(clean)) {
      setError(`"${clean}" is already configured.`);
      setTimeout(() => setError(null), 2500);
      return;
    }

    onChange([...tags, clean]);
    setInputValue("");
    setError(null);
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      handleRemove(tags[tags.length - 1]);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || description) && (
        <div className="flex items-center justify-between">
          <div>
            {label && (
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                {icon || <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
                {label}
                <span className="text-[10px] text-muted-foreground font-mono font-normal">
                  ({tags.length})
                </span>
              </label>
            )}
            {description && (
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{description}</p>
            )}
          </div>

          {tags.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Input container */}
      <div className="bg-background border border-border focus-within:border-ring focus-within:ring-1 focus-within:ring-ring rounded-lg p-2.5 space-y-2 transition-all">
        {/* Rendered Badges Grid */}
        <div className="flex flex-wrap items-center gap-1.5 min-h-[26px]">
          {tags.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">No domains configured</span>
          ) : (
            tags.map((tag) => (
              <Badge
                key={tag}
                variant={badgeVariant}
                size="sm"
                radius="full"
                dismissible
                onDismiss={() => handleRemove(tag)}
                className="font-mono text-[10px]"
              >
                {tag}
              </Badge>
            ))
          )}
        </div>

        {/* Entry field */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-mono"
          />
          <button
            type="button"
            onClick={() => handleAdd()}
            disabled={!inputValue.trim()}
            className="px-2.5 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40 border border-border/50 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[10px] text-destructive font-medium px-1">
          {error}
        </p>
      )}
    </div>
  );
}
