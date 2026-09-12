import * as React from "react";

import { Input } from "../primitives/input";

export interface NumberFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: number | null;
  onValueChange: (value: number | null) => void;
}

export const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(
  ({ value, onValueChange, ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      value={value === null ? "" : String(value)}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === "") {
          onValueChange(null);
          return;
        }
        const next = Number(raw);
        if (Number.isFinite(next)) onValueChange(next);
      }}
      {...props}
    />
  ),
);
NumberField.displayName = "NumberField";
