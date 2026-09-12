import { Search, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { Input } from "../primitives/input";

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (value: string) => void;
  clearLabel?: string;
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onValueChange, clearLabel = "清除", className, ...props }, ref) => (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-faint" />
      <Input
        ref={ref}
        type="text"
        role="searchbox"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn("pr-8 pl-8", className)}
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => onValueChange("")}
          className={cn(
            "absolute top-1/2 right-2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-fg-faint",
            "hover:bg-fg/8 hover:text-fg",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  ),
);
SearchField.displayName = "SearchField";
