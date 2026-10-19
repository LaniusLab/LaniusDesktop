import { Play, Redo2, Save, Undo2, Wand2 } from "lucide-react";
import { useState } from "react";

import { currentContext } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { PROCESS_CATALOG } from "@/lib/targets";
import { TemplateInspector } from "@/modules/flow-editor/inspector";
import { MindMapPreview } from "@/modules/flow-editor/mind-map-preview";
import { TemplatePalette } from "@/modules/flow-editor/palette";
import { TemplateSequence } from "@/modules/flow-editor/sequence";
import { redoEdit, undoEdit, useEditorStore } from "@/stores/editor";
import { useExecutionStore } from "@/stores/execution";
import { useT, useUiStore } from "@/stores/ui";
import { Badge, Button, PageHeader, Select, SplitPane, StatusBadge, Tabs, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";

type CenterTab = "strip" | "mind";

/** 模板页：指令条缩进 + 插入菜单 + 只读导图预览。 */
export function FlowsPage() {
  const dirty = useEditorStore((s) => s.dirty);
  const processId = useEditorStore((s) => s.processId);
  const locate = useEditorStore((s) => s.locate);
  const bindProcess = useEditorStore((s) => s.bindProcess);
  const editorPaletteWidth = useUiStore((s) => s.editorPaletteWidth);
  const setEditorPaletteWidth = useUiStore((s) => s.setEditorPaletteWidth);
  const editorInspectorWidth = useUiStore((s) => s.editorInspectorWidth);
  const setEditorInspectorWidth = useUiStore((s) => s.setEditorInspectorWidth);
  const editorLogHeight = useUiStore((s) => s.editorLogHeight);
  const setEditorLogHeight = useUiStore((s) => s.setEditorLogHeight);
  const logLines = useExecutionStore((s) => s.logLines);
  const phase = useExecutionStore((s) => s.phase);
  const t = useT();
  const [centerTab, setCenterTab] = useState<CenterTab>("strip");
  const runCommand = (id: string) => void registry.run(id, currentContext());
  const processName = PROCESS_CATALOG.find((item) => item.id === processId)?.name ?? processId;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t("edit.title")}
        description={t("edit.description")}
        actions={
          <>
            {dirty ? <Badge tone="warning">{t("edit.dirty")}</Badge> : <Badge>{t("edit.saved")}</Badge>}
            <StatusBadge state={phase} />
            <Select
              aria-label={t("start.process")}
              value={processId}
              onChange={(event) => bindProcess(event.target.value)}
              className="w-44"
            >
              {PROCESS_CATALOG.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Badge tone="accent">
              {locate.channel === "vision" ? t("start.locate.vision") : t("start.locate.a11y")}
            </Badge>
            <span className="sr-only">{processName}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={undoEdit} aria-label={t("edit.undo")}>
                  <Undo2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("edit.undo")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={redoEdit} aria-label={t("edit.redo")}>
                  <Redo2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("edit.redo")}</TooltipContent>
            </Tooltip>
            <Button variant="secondary" size="sm" aria-label={t("cmd.flow.save")} onClick={() => runCommand("flow.save")}>
              <Save />
              {t("edit.save")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => runCommand("flow.dryRun")}>
              <Wand2 />
              {t("start.dryRun")}
            </Button>
            <Button size="sm" onClick={() => runCommand("flow.run")}>
              <Play />
              {t("start.run")}
            </Button>
          </>
        }
      />
      <SplitPane
        className="min-h-0 flex-1"
        size={editorPaletteWidth}
        onSizeChange={setEditorPaletteWidth}
        min={200}
        max={420}
        minSecond={320}
        label={t("layout.resize.horizontal")}
      >
        <TemplatePalette />
        <SplitPane
          className="h-full min-h-0"
          primary="second"
          size={editorInspectorWidth}
          onSizeChange={setEditorInspectorWidth}
          min={220}
          max={420}
          minSecond={240}
          label={t("layout.resize.horizontal")}
        >
          <SplitPane
            orientation="vertical"
            className="h-full"
            primary="second"
            size={editorLogHeight}
            onSizeChange={setEditorLogHeight}
            min={88}
            minSecond={160}
            label={t("layout.resize.vertical")}
          >
            <div className="flex h-full min-h-0 min-w-0 flex-col bg-surface/40">
              <div className="border-b border-line px-3 py-2">
                <Tabs
                  value={centerTab}
                  onValueChange={setCenterTab}
                  items={[
                    { value: "strip", label: t("edit.tab.strip") },
                    { value: "mind", label: t("edit.tab.mind") },
                  ]}
                />
              </div>
              <div className="min-h-0 flex-1">
                {centerTab === "strip" ? <TemplateSequence /> : <MindMapPreview />}
              </div>
            </div>
            <section className="glass-card flex h-full min-h-0 flex-col rounded-none px-4 py-3">
              <p className="font-display text-sm text-fg">{t("start.log")}</p>
              {logLines.length === 0 ? (
                <p className="m-auto text-sm text-fg-faint">{t("start.logEmpty")}</p>
              ) : (
                <ol className="mt-2 min-h-0 flex-1 overflow-auto">
                  {logLines.map((line, index) => (
                    <li
                      key={`${String(line.ts)}-${String(index)}`}
                      className="border-b border-line/70 py-1.5 text-xs text-fg-muted last:border-b-0"
                    >
                      {line.message}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </SplitPane>
          <TemplateInspector />
        </SplitPane>
      </SplitPane>
    </div>
  );
}
