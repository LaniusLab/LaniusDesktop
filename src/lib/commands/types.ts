import type { Bridge, EngineStatus, ExecutionPhase, FlowRunResult } from "@/lib/bridge";
import type { FlowFile } from "@/lib/gen/flow";

// 命令求值上下文：显式注入，不读全局单例，保证可测试（ADR-0007）
export interface CommandContext {
  bridge: Bridge;
  engine: { status: EngineStatus };
  execution: {
    phase: ExecutionPhase;
    ingestRunResult: (result: FlowRunResult) => void;
  };
  editor: { dirty: boolean; toFlowFile: () => FlowFile };
  navigate: (to: string) => void;
  ui: {
    toggleTheme: () => void;
    setSearchOpen: (open: boolean) => void;
    setSettingsOpen: (open: boolean) => void;
  };
}

export interface Command {
  id: string;
  title: string;
  scope: "global" | "editor" | "history";
  shortcut?: string;
  when?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void | Promise<void>;
}
