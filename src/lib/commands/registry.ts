import type { Command, CommandContext } from "./types";

class CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command): void {
    if (this.commands.has(command.id)) {
      throw new Error(`命令重复注册: ${command.id}`);
    }
    if (command.shortcut) {
      for (const existing of this.commands.values()) {
        if (existing.shortcut === command.shortcut) {
          throw new Error(
            `快捷键冲突: ${command.shortcut} 同时绑定 ${existing.id} 与 ${command.id}`,
          );
        }
      }
    }
    this.commands.set(command.id, command);
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  list(ctx: CommandContext): Array<Command & { enabled: boolean }> {
    return [...this.commands.values()].map((cmd) => ({
      ...cmd,
      enabled: cmd.when ? cmd.when(ctx) : true,
    }));
  }

  async run(id: string, ctx: CommandContext): Promise<boolean> {
    const command = this.commands.get(id);
    if (!command) return false;
    if (command.when && !command.when(ctx)) return false;
    await command.run(ctx);
    return true;
  }
}

export const registry = new CommandRegistry();
