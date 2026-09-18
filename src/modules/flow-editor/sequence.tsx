import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";

import { decodeStepDrag, encodeStepDrag, type TemplateStep } from "@/lib/template";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { useT } from "@/stores/ui";
import { Badge, Button, EmptyState, Kbd } from "@/ui";

export function TemplateSequence() {
  const t = useT();
  const steps = useEditorStore((s) => s.steps);
  const insertStep = useEditorStore((s) => s.insertStep);
  const moveStep = useEditorStore((s) => s.moveStep);
  const removeStep = useEditorStore((s) => s.removeStep);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const applyDrop = (index: number, raw: string) => {
    const payload = decodeStepDrag(raw);
    if (!payload) return;
    if (payload.source === "palette") {
      insertStep(payload.draft, index);
      return;
    }
    const from = steps.findIndex((step) => step.id === payload.id);
    if (from < 0) return;
    const adjusted = from < index ? index - 1 : index;
    moveStep(from, adjusted);
  };

  if (steps.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center px-6"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          applyDrop(0, event.dataTransfer.getData("text/plain"));
        }}
      >
        <EmptyState title={t("edit.emptyTitle")} description={t("edit.emptyHint")} />
      </div>
    );
  }

  return (
    <ol className="m-0 flex h-full list-none flex-col gap-1 overflow-auto px-4 py-4">
      {steps.map((step, index) => (
        <li key={step.id}>
          {dropIndex === index ? <div className="mb-1 h-1 rounded-full bg-accent" /> : null}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDropIndex(index);
            }}
            onDragLeave={() => setDropIndex(null)}
            onDrop={(event) => {
              event.preventDefault();
              setDropIndex(null);
              applyDrop(index, event.dataTransfer.getData("text/plain"));
            }}
          >
            <StepRow
              step={step}
              index={index}
              total={steps.length}
              onMoveUp={() => moveStep(index, index - 1)}
              onMoveDown={() => moveStep(index, index + 1)}
              onRemove={() => removeStep(step.id)}
            />
          </div>
        </li>
      ))}
      <li
        className={cn(
          "min-h-12 rounded-xl border border-dashed border-line",
          dropIndex === steps.length && "border-accent bg-accent-soft",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDropIndex(steps.length);
        }}
        onDragLeave={() => setDropIndex(null)}
        onDrop={(event) => {
          event.preventDefault();
          setDropIndex(null);
          applyDrop(steps.length, event.dataTransfer.getData("text/plain"));
        }}
      >
        <p className="px-3 py-2 text-xs text-fg-faint">{t("edit.dropEnd")}</p>
      </li>
    </ol>
  );
}

function StepRow({
  step,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  step: TemplateStep;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const kindLabel =
    step.kind === "binding"
      ? t("edit.kind.binding")
      : step.kind === "mouse"
        ? t("edit.kind.mouse")
        : t("edit.kind.preset");

  return (
    <div
      className="glass-card flex items-center gap-2 rounded-xl px-2 py-2"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", encodeStepDrag({ source: "reorder", id: step.id }));
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <GripVertical className="size-4 shrink-0 text-fg-faint" aria-hidden />
      <span className="w-6 font-display text-sm text-fg-faint">{String(index + 1).padStart(2, "0")}</span>
      <Badge>{kindLabel}</Badge>
      <span className="min-w-0 flex-1 truncate text-sm text-fg">{step.label}</span>
      {step.keys ? <Kbd>{step.keys}</Kbd> : null}
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("edit.moveUp")}
        disabled={index === 0}
        onClick={onMoveUp}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("edit.moveDown")}
        disabled={index === total - 1}
        onClick={onMoveDown}
      >
        <ArrowDown />
      </Button>
      <Button variant="ghost" size="icon" aria-label={t("edit.removeStep")} onClick={onRemove}>
        <Trash2 />
      </Button>
    </div>
  );
}
