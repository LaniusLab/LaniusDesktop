import { FileUp, X } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";

import { cn } from "@/lib/utils";

import { Chip } from "../primitives/chip";

export interface FileFieldProps {
  files: readonly File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
  browseLabel?: string;
  clearLabel?: string;
  dropLabel?: string;
  label?: string;
  className?: string;
}

function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

export function FileField({
  files,
  onFilesChange,
  accept,
  multiple = false,
  disabled,
  placeholder = "未选择文件",
  browseLabel = "选择文件",
  clearLabel = "清除",
  dropLabel = "或拖放到此处",
  label = "文件选择",
  className,
}: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [over, setOver] = useState(false);

  const apply = (incoming: File[]) => {
    const allowed = incoming.filter((file) => matchesAccept(file, accept));
    if (allowed.length === 0) return;
    onFilesChange(multiple ? allowed : allowed.slice(0, 1));
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setOver(true);
  };

  return (
    <div
      role="group"
      aria-label={label}
      onDragOver={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (disabled) return;
        apply([...event.dataTransfer.files]);
      }}
      className={cn(
        "rounded-xl border border-dashed px-3 py-3 transition-colors",
        over ? "border-accent bg-accent-soft" : "border-line bg-surface-raised/60",
        disabled && "opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={browseLabel}
        className="sr-only"
        onChange={(event) => {
          const list = event.target.files;
          if (list) apply([...list]);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-sm text-fg",
            "hover:border-line-strong",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            "disabled:cursor-not-allowed",
          )}
        >
          <FileUp className="size-4 text-fg-muted" />
          {browseLabel}
        </button>
        <span className="text-xs text-fg-faint">{dropLabel}</span>
        {files.length > 0 ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={clearLabel}
            onClick={() => onFilesChange([])}
            className={cn(
              "ml-auto inline-flex size-7 items-center justify-center rounded-md text-fg-muted",
              "hover:bg-fg/8 hover:text-fg",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              "disabled:cursor-not-allowed",
            )}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-2 min-h-6">
        {files.length === 0 ? (
          <p className="text-sm text-fg-faint">{placeholder}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {files.map((file) => (
              <Chip
                key={`${file.name}-${String(file.size)}-${String(file.lastModified)}`}
                onRemove={disabled ? undefined : () => onFilesChange(files.filter((entry) => entry !== file))}
              >
                {file.name}
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
