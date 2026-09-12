import { Primitive } from "@radix-ui/react-primitive";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Primitive 节点表不含 table 系元素；外层滚动容器走 `Primitive.div`。 */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <Primitive.div className="overflow-x-auto rounded-xl border border-line">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </Primitive.div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-surface-sunken/70 text-fg-muted", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-fg/4", className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("px-3 py-2 text-left text-xs font-medium tracking-wide whitespace-nowrap", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2 text-fg align-middle", className)} {...props} />;
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn("px-3 py-2 text-xs text-fg-faint", className)} {...props} />;
}
