import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, type ButtonProps } from "../primitives/button";

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  label?: string;
  copiedLabel?: string;
}

export function CopyButton({
  value,
  label = "复制",
  copiedLabel = "已复制",
  variant = "outline",
  size = "sm",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1500);
  };

  const caption = copied ? copiedLabel : label;

  return (
    <Button type="button" variant={variant} size={size} onClick={() => void onCopy()} aria-label={caption} {...props}>
      {copied ? <Check /> : <Copy />}
      {size === "icon" ? null : caption}
    </Button>
  );
}
