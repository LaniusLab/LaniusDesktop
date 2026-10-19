import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  flattenSteps,
  INSERT_PRESETS,
  readStepDrag,
  stepIssueKey,
  writeStepDrag,
  type FlatStepRow,
  type TemplateDraft,
  type TemplateStep,
} from "@/lib/template";
import { cn } from "@/lib/utils";
import { useEditorStore, type InsertBranch } from "@/stores/editor";
import { useExecutionStore, type StepRunStatus } from "@/stores/execution";
import { useValidationStore } from "@/stores/validation";
import { useT } from "@/stores/ui";
import { Badge, Button, EmptyState, Kbd, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/ui";

export function TemplateSequence() {
  const t = useT();
  const steps = useEditorStore((s) => s.steps);
  const insertStep = useEditorStore((s) => s.insertStep);
  const moveStep = useEditorStore((s) => s.moveStep);
  const removeStep = useEditorStore((s) => s.removeStep);
  const selectStep = useEditorStore((s) => s.selectStep);
  const selectedStepId = useEditorStore((s) => s.selectedStepId);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const rows = flattenSteps(steps);

  const applyDrop = (
    index: number,
    transfer: DataTransfer,
    target?: { parentId?: string; branch?: InsertBranch },
  ) => {
    const payload = readStepDrag(transfer);
    if (!payload) return;
    if (payload.source === "palette") {
      if (target?.parentId && target.branch && target.branch !== "root") {
        insertStep(payload.draft, { parentId: target.parentId, branch: target.branch });
        return;
      }
      insertStep(payload.draft, { index });
      return;
    }
    // 重排仅作用于根级，避免嵌套树错位
    if (target?.parentId) return;
    const from = steps.findIndex((step) => step.id === payload.id);
    if (from < 0) return;
    const adjusted = from < index ? index - 1 : index;
    moveStep(from, adjusted);
  };

  if (steps.length === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 px-6"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          applyDrop(0, event.dataTransfer);
        }}
      >
        <EmptyState title={t("edit.emptyTitle")} description={t("edit.emptyHint")} />
        <InsertMenu
          onPick={(draft) => insertStep(draft)}
          label={t("edit.insert")}
        />
      </div>
    );
  }

  return (
    <ol className="m-0 flex h-full list-none flex-col gap-0.5 overflow-auto px-3 py-3">
      {rows.map((row, index) => {
        if (row.marker) {
          return (
            <li key={row.step.id}>
              <BranchMarker
                row={row}
                onDrop={(transfer) => {
                  const branch = row.marker === "then" || row.marker === "else" ? row.marker : "body";
                  applyDrop(index, transfer, { parentId: row.parentId, branch });
                }}
                onInsert={(draft) => {
                  const branch = row.marker === "then" || row.marker === "else" ? row.marker : "body";
                  if (row.parentId) insertStep(draft, { parentId: row.parentId, branch });
                }}
              />
            </li>
          );
        }
        const rootIndex = steps.findIndex((step) => step.id === row.step.id);
        const isRoot = rootIndex >= 0 && row.depth === 0;
        return (
          <li key={row.step.id}>
            {dropIndex === rootIndex && isRoot ? <div className="mb-1 h-1 rounded-full bg-accent" /> : null}
            <div
              style={{ paddingLeft: `${row.depth * 16}px` }}
              onDragOver={(event) => {
                if (!isRoot) return;
                event.preventDefault();
                setDropIndex(rootIndex);
              }}
              onDragLeave={() => setDropIndex(null)}
              onDrop={(event) => {
                if (!isRoot) return;
                event.preventDefault();
                setDropIndex(null);
                applyDrop(rootIndex, event.dataTransfer);
              }}
            >
              <StepRow
                step={row.step}
                index={isRoot ? rootIndex : index}
                total={steps.length}
                depth={row.depth}
                selected={row.step.id === selectedStepId}
                canReorder={isRoot}
                onSelect={() => selectStep(row.step.id)}
                onMoveUp={() => {
                  if (isRoot) moveStep(rootIndex, rootIndex - 1);
                }}
                onMoveDown={() => {
                  if (isRoot) moveStep(rootIndex, rootIndex + 1);
                }}
                onRemove={() => removeStep(row.step.id)}
                onInsertAfter={(draft) => {
                  if (isRoot) insertStep(draft, { index: rootIndex + 1 });
                  else if (row.parentId && row.branch) {
                    insertStep(draft, { parentId: row.parentId, branch: row.branch });
                  } else insertStep(draft);
                }}
              />
            </div>
          </li>
        );
      })}
      <li
        className={cn(
          "mt-1 min-h-12 rounded-xl border border-dashed border-line",
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
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-xs text-fg-faint">{t("edit.dropEnd")}</p>
          <InsertMenu onPick={(draft) => insertStep(draft)} label={t("edit.insert")} />
        </div>
      </li>
    </ol>
  );
}

function BranchMarker({
  row,
  onDrop,
  onInsert,
}: {
  row: FlatStepRow;
  onDrop: (transfer: DataTransfer) => void;
  onInsert: (draft: TemplateDraft) => void;
}) {
  const t = useT();
  return (
    <div
      style={{ paddingLeft: `${row.depth * 16}px` }}
      className="my-0.5 flex items-center gap-2 rounded-lg border border-dashed border-line/80 bg-surface-sunken/40 px-2 py-1"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(event.dataTransfer);
      }}
    >
      <span className="text-xs font-medium text-fg-muted">{row.step.label}</span>
      <InsertMenu onPick={onInsert} label={t("edit.insertInto")} compact />
    </div>
  );
}

function StepRow({
  step,
  index,
  total,
  depth,
  selected,
  canReorder,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onInsertAfter,
}: {
  step: TemplateStep;
  index: number;
  total: number;
  depth: number;
  selected: boolean;
  canReorder: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onInsertAfter: (draft: TemplateDraft) => void;
}) {
  const t = useT();
  const runStatus = useExecutionStore((s) => s.stepStatuses[step.id]);
  const activeStepId = useExecutionStore((s) => s.activeStepId);
  const allIssues = useValidationStore((s) => s.issues);
  const engineIssue = allIssues.find((issue) => issue.nodeId === step.id);
  const localIssue = stepIssueKey(step);
  const issueMessage = engineIssue?.message ?? (localIssue ? t(localIssue) : null);
  const kindLabel =
    step.kind === "binding"
      ? t("edit.kind.binding")
      : step.kind === "mouse"
        ? t("edit.kind.mouse")
        : step.kind === "control"
          ? t("edit.kind.control")
          : t("edit.kind.preset");

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-transparent bg-surface-raised/60 px-2 py-1.5 transition-colors",
        selected && "border-accent bg-accent-soft",
        activeStepId === step.id && "ring-1 ring-accent",
        step.disabled && "opacity-60",
        depth > 0 && "border-l-2 border-l-line-strong",
      )}
      draggable={canReorder}
      onClick={onSelect}
      onDragStart={(event) => {
        if (!canReorder) return;
        writeStepDrag(event.dataTransfer, { source: "reorder", id: step.id });
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      {canReorder ? <GripVertical className="size-4 shrink-0 text-fg-faint" aria-hidden /> : (
        <span className="w-4 shrink-0" aria-hidden />
      )}
      <span className="w-6 font-display text-sm text-fg-faint">
        {canReorder ? String(index + 1).padStart(2, "0") : "·"}
      </span>
      <Badge>{kindLabel}</Badge>
      <span className={cn("min-w-0 flex-1 truncate text-sm", step.disabled ? "text-fg-muted line-through" : "text-fg")}>
        {step.label}
      </span>
      {issueMessage ? (
        <Badge tone="danger" title={issueMessage}>
          {t("edit.issue.badge")}
        </Badge>
      ) : (
        <RunStatusBadge status={runStatus} />
      )}
      {step.keys ? <Kbd>{step.keys}</Kbd> : null}
      <InsertMenu onPick={onInsertAfter} label={t("edit.insert")} compact />
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("edit.moveUp")}
        disabled={!canReorder || index === 0}
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
        disabled={!canReorder || index === total - 1}
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

function InsertMenu({
  onPick,
  label,
  compact = false,
}: {
  onPick: (draft: TemplateDraft) => void;
  label: string;
  compact?: boolean;
}) {
  const t = useT();
  const groups = [
    { id: "keys" as const, title: t("edit.group.keys") },
    { id: "vision" as const, title: t("edit.group.vision") },
    { id: "control" as const, title: t("edit.group.control") },
    { id: "preset" as const, title: t("edit.group.presets") },
  ];

  return (
    <Menu>
      <MenuTrigger
        aria-label={label}
        className={cn(compact && "h-7 w-7 px-0")}
        onClick={(event) => event.stopPropagation()}
      >
        {compact ? <Plus className="size-3.5" /> : (
          <>
            <Plus className="size-3.5" />
            <span className="ml-1">{label}</span>
          </>
        )}
      </MenuTrigger>
      <MenuContent align="end">
        {groups.map((group, groupIndex) => {
          const items = INSERT_PRESETS.filter((item) => item.group === group.id && item.available);
          if (items.length === 0) return null;
          return (
            <div key={group.id}>
              {groupIndex > 0 ? <MenuSeparator /> : null}
              <p className="px-2.5 py-1 text-[10px] uppercase tracking-wide text-fg-faint">{group.title}</p>
              {items.map((item) => (
                <MenuItem
                  key={item.type}
                  onSelect={() => {
                    onPick({
                      kind: item.kind ?? "preset",
                      type: item.type,
                      label: t(item.labelKey),
                      config: { ...(item.config ?? {}) },
                      then: item.type === "flow.if" ? [] : undefined,
                      else: item.type === "flow.if" ? [] : undefined,
                      body: item.type === "flow.loop" ? [] : undefined,
                    });
                  }}
                >
                  {t(item.labelKey)}
                </MenuItem>
              ))}
            </div>
          );
        })}
      </MenuContent>
    </Menu>
  );
}

function RunStatusBadge({ status }: { status?: StepRunStatus }) {
  const t = useT();
  if (!status || status === "pending") return null;
  const tone = status === "failed" ? "danger" : status === "running" ? "accent" : "neutral";
  return <Badge tone={tone}>{t(`edit.run.${status}`)}</Badge>;
}
