import type { Bridge, EngineStatus, ExecutionPhase, FlowRunResult } from "@/lib/bridge";
import type { FlowFile } from "@/lib/gen/flow";

// 命令求值上下文：显式注入，不读全局单例，保证可测试（ADR-0007）
export interface CommandContext {
  bridge: Bridge;
  engine: { status: EngineStatus };
  execution: {
    phase: ExecutionPhase;
    activeExecutionId?: string;
    beginRun: (input: {
      mode: "run" | "dryRun";
      exe: string;
      channel: string;
      steps: Array<{ id: string; disabled?: boolean }>;
    }) => void;
    ingestRunResult: (result: FlowRunResult) => void;
  };
  editor: {
    dirty: boolean;
    hasTarget: boolean;
    filePath?: string;
    toFlowFile: () => FlowFile;
    saveTemplate: () => void;
    loadFlowFile: (
      flow: FlowFile,
      path: string,
      migration?: { migratedFrom?: number; migratedTo?: number },
    ) => void;
    setFilePath: (path: string | undefined) => void;
    markSaved: () => void;
  };
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
