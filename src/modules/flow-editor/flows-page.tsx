import { Background, ReactFlow } from "@xyflow/react";
import { Keyboard, MousePointer2, PencilLine, Play, Redo2, Undo2, Wand2 } from "lucide-react";

import "@xyflow/react/dist/style.css";

import { currentContext } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { cn } from "@/lib/utils";
import { redoEdit, undoEdit, useEditorStore } from "@/stores/editor";
import { useT, useUiStore } from "@/stores/ui";
import { Badge, Button, PageHeader, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";

const PALETTE_GROUPS = [
  { titleKey: "edit.group.keys", hintKey: "edit.group.keysHint", icon: Keyboard },
  { titleKey: "edit.group.mouse", hintKey: "edit.group.mouseHint", icon: MousePointer2 },
  { titleKey: "edit.group.window", hintKey: "edit.group.windowHint", icon: PencilLine },
] as const;

/** 编排页。脚本入口：M0 为演示画布；积木拖拽 / 属性 / 存盘属 M2 */
export function FlowsPage() {
  const { nodes, edges, dirty, onNodesChange, onEdgesChange, onConnect } = useEditorStore();
  const theme = useUiStore((s) => s.resolvedTheme);
  const t = useT();
  const runCommand = (id: string) => void registry.run(id, currentContext());

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t("edit.title")}
        description={t("edit.description")}
        actions={
          <>
            {dirty ? <Badge tone="warning">{t("edit.dirty")}</Badge> : <Badge>{t("edit.saved")}</Badge>}
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
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-48 shrink-0 flex-col gap-2 border-r border-line bg-surface px-3 py-4">
          <p className="px-1 font-display text-sm text-fg animate-rise">{t("edit.blocks")}</p>
          <p className="px-1 text-xs leading-relaxed text-fg-muted animate-rise delay-1">
            {t("edit.blocksHint")}
          </p>
          {PALETTE_GROUPS.map((group, index) => (
            <div
              key={group.titleKey}
              className={cn(
                "rounded-md border border-dashed border-line bg-bg px-3 py-2.5 opacity-80 animate-rise",
                index === 0 && "delay-2",
                index === 1 && "delay-3",
                index === 2 && "delay-4",
              )}
            >
              <p className="flex items-center gap-1.5 text-sm text-fg">
                <group.icon className="size-3.5 text-accent" />
                {t(group.titleKey)}
              </p>
              <p className="mt-1 text-xs text-fg-faint">{t(group.hintKey)}</p>
            </div>
          ))}
        </aside>
        <div className="min-h-0 min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            colorMode={theme === "dark" ? "dark" : "light"}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={28} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
