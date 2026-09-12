import { Primitive } from "@radix-ui/react-primitive";
import { useEffect, useState } from "react";

import { eventToShortcut, formatShortcut } from "@/lib/shortcut";

import { Kbd } from "../primitives/kbd";

export interface KeyRecorderProps {
  value: string;
  onChange: (next: string) => void;
  recordingLabel: string;
  emptyLabel?: string;
  disabled?: boolean;
}

export function KeyRecorder({
  value,
  onChange,
  recordingLabel,
  emptyLabel = "…",
  disabled = false,
}: KeyRecorderProps) {
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (disabled) setRecording(false);
  }, [disabled]);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setRecording(false);
        return;
      }
      const next = eventToShortcut(event);
      if (!next) return;
      onChange(next);
      setRecording(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, onChange]);

  return (
    <Kbd asChild>
      <Primitive.button
        type="button"
        disabled={disabled}
        aria-pressed={recording}
        onClick={() => setRecording(true)}
      >
        {recording ? recordingLabel : value ? formatShortcut(value) : emptyLabel}
      </Primitive.button>
    </Kbd>
  );
}
