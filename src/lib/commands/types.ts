import type { Bridge, EngineStatus } from "@/lib/bridge";
import type { ExecutionPhase } from "@/lib/bridge";

// 命令求值上下文：显式注入，不读全局单例，保证可测试（ADR-0007）
export interface CommandContext {
  bridge: Bridge;
  engine: { status: EngineStatus };
  execution: { phase: ExecutionPhase };
  editor: { dirty: boolean };
  navigate: (to: string) => void;
  ui: { toggleTheme: () => void; setSearchOpen: (open: boolean) => void };
}

export interface Command {
  id: string;
  title: string;
  scope: "global" | "editor" | "history";
  shortcut?: string;
  when?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void | Promise<void>;
}
