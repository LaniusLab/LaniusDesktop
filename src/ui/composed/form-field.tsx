import * as React from "react";

import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/** 标签 + 控件 + 提示/错误的统一行式布局，节点属性面板的默认形态 */
export function FormField({ label, htmlFor, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-faint">{hint}</p>
      ) : null}
    </div>
  );
}
