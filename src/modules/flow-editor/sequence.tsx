import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";

import { readStepDrag, stepIssueKey, writeStepDrag, type TemplateStep } from "@/lib/template";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { useExecutionStore, type StepRunStatus } from "@/stores/execution";
import { useT } from "@/stores/ui";
import { Badge, Button, EmptyState, Kbd } from "@/ui";

export function TemplateSequence() {
  const t = useT();
  const steps = useEditorStore((s) => s.steps);
  const insertStep = useEditorStore((s) => s.insertStep);
  const moveStep = useEditorStore((s) => s.moveStep);
  const removeStep = useEditorStore((s) => s.removeStep);
  const selectStep = useEditorStore((s) => s.selectStep);
  const selectedStepId = useEditorStore((s) => s.selectedStepId);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const applyDrop = (index: number, transfer: DataTransfer) => {
    const payload = readStepDrag(transfer);
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
          applyDrop(0, event.dataTransfer);
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
              applyDrop(index, event.dataTransfer);
            }}
          >
            <StepRow
              step={step}
              index={index}
              total={steps.length}
              selected={step.id === selectedStepId}
              onSelect={() => selectStep(step.id)}
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
          applyDrop(steps.length, event.dataTransfer);
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
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  step: TemplateStep;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const runStatus = useExecutionStore((s) => s.stepStatuses[step.id]);
  const activeStepId = useExecutionStore((s) => s.activeStepId);
  const issue = stepIssueKey(step);
  const kindLabel =
    step.kind === "binding"
      ? t("edit.kind.binding")
      : step.kind === "mouse"
        ? t("edit.kind.mouse")
        : t("edit.kind.preset");

  return (
    <div
      className={cn(
        "glass-card flex items-center gap-2 rounded-xl px-2 py-2",
        selected && "border-accent bg-accent-soft",
        activeStepId === step.id && "ring-1 ring-accent",
        step.disabled && "opacity-60",
      )}
      draggable
      onClick={onSelect}
      onDragStart={(event) => {
        writeStepDrag(event.dataTransfer, { source: "reorder", id: step.id });
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <GripVertical className="size-4 shrink-0 text-fg-faint" aria-hidden />
      <span className="w-6 font-display text-sm text-fg-faint">{String(index + 1).padStart(2, "0")}</span>
      <Badge>{kindLabel}</Badge>
      <span className={cn("min-w-0 flex-1 truncate text-sm", step.disabled ? "text-fg-muted line-through" : "text-fg")}>
        {step.label}
      </span>
      {issue ? (
        <Badge tone="danger">{t("edit.issue.badge")}</Badge>
      ) : (
        <RunStatusBadge status={runStatus} />
      )}
      {step.keys ? <Kbd>{step.keys}</Kbd> : null}
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("edit.moveUp")}
        disabled={index === 0}
        onClick={(event) => {
          event.stopPropagation();
          onMoveUp();
        }}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("edit.moveDown")}
        disabled={index === total - 1}
        onClick={(event) => {
          event.stopPropagation();
          onMoveDown();
        }}
      >
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("edit.removeStep")}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function RunStatusBadge({ status }: { status?: StepRunStatus }) {
  const t = useT();
  if (!status || status === "pending") return null;
  const tone = status === "failed" ? "danger" : status === "running" ? "accent" : "neutral";
  return <Badge tone={tone}>{t(`edit.run.${status}`)}</Badge>;
}
