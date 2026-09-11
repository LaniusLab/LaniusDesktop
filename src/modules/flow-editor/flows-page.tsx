import { Background, Controls, ReactFlow } from "@xyflow/react";
import { Play, Redo2, Undo2, Wand2 } from "lucide-react";

import "@xyflow/react/dist/style.css";

import { currentContext } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { redoEdit, undoEdit, useEditorStore } from "@/stores/editor";
import { Badge, Button, PageHeader, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";

/** 流程编排页。M0 为演示画布；完整编辑器（节点面板/属性表单/校验上图）属 M2 */
export function FlowsPage() {
  const { nodes, edges, dirty, onNodesChange, onEdgesChange, onConnect } = useEditorStore();

  const runCommand = (id: string) => void registry.run(id, currentContext());

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="未命名流程"
        description="示例画布 —— 完整编辑器能力在 M2 里程碑交付"
        actions={
          <>
            {dirty ? <Badge tone="warning">未保存</Badge> : <Badge>已保存</Badge>}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={undoEdit} aria-label="撤销">
                  <Undo2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>撤销</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={redoEdit} aria-label="重做">
                  <Redo2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>重做</TooltipContent>
            </Tooltip>
            <Button variant="secondary" size="sm" onClick={() => runCommand("flow.dryRun")}>
              <Wand2 />
              预演
            </Button>
            <Button size="sm" onClick={() => runCommand("flow.run")}>
              <Play />
              运行
            </Button>
          </>
        }
      />
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
