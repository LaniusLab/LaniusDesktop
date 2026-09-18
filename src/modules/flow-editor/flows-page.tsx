import { Play, Redo2, Undo2, Wand2 } from "lucide-react";

import { currentContext } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { PROCESS_CATALOG } from "@/lib/targets";
import { TemplatePalette } from "@/modules/flow-editor/palette";
import { TemplateSequence } from "@/modules/flow-editor/sequence";
import { redoEdit, undoEdit, useEditorStore } from "@/stores/editor";
import { useT, useUiStore } from "@/stores/ui";
import { Badge, Button, PageHeader, Select, SplitPane, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";

/** 模板页：从按键方案与预设操作拖入有序列表，运行时绑到选定窗口。 */
export function FlowsPage() {
  const dirty = useEditorStore((s) => s.dirty);
  const processId = useEditorStore((s) => s.processId);
  const locate = useEditorStore((s) => s.locate);
  const bindProcess = useEditorStore((s) => s.bindProcess);
  const editorPaletteWidth = useUiStore((s) => s.editorPaletteWidth);
  const setEditorPaletteWidth = useUiStore((s) => s.setEditorPaletteWidth);
  const t = useT();
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
        minSecond={240}
        label={t("layout.resize.horizontal")}
      >
        <TemplatePalette />
        <div className="h-full min-h-0 min-w-0 bg-surface/40">
          <TemplateSequence />
        </div>
      </SplitPane>
    </div>
  );
}
