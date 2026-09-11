import { useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";

import { bridge } from "@/lib/bridge";
import { useUiStore } from "@/stores/ui";
import { Badge, Button, PageHeader, Separator } from "@/ui";

export function SettingsPage() {
  const { theme, toggleTheme } = useUiStore();
  const engineInfo = useQuery({ queryKey: ["engineInfo"], queryFn: () => bridge.engineInfo() });

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="设置" description="外观与引擎信息" />
      <div className="max-w-2xl px-6 py-6">
        <section>
          <h2 className="text-sm font-semibold text-fg">外观</h2>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
            <div>
              <p className="text-sm text-fg">主题</p>
              <p className="text-xs text-fg-muted">当前：{theme === "dark" ? "深色" : "浅色"}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? <Sun /> : <Moon />}
              切换主题
            </Button>
          </div>
        </section>

        <Separator className="my-6" />

        <section>
          <h2 className="text-sm font-semibold text-fg">引擎</h2>
          <div className="mt-3 rounded-lg border border-line bg-surface px-4 py-3">
            {engineInfo.isPending ? (
              <p className="text-sm text-fg-muted">查询中…</p>
            ) : engineInfo.isError ? (
              <p className="text-sm text-danger">引擎信息获取失败</p>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-fg-muted">引擎版本</dt>
                <dd className="font-mono text-fg">{engineInfo.data.engineVersion}</dd>
                <dt className="text-fg-muted">协议版本</dt>
                <dd className="font-mono text-fg">{engineInfo.data.protocolVersion}</dd>
                <dt className="text-fg-muted">能力</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {engineInfo.data.capabilities.map((cap) => (
                    <Badge key={cap} tone="accent">
                      {cap}
                    </Badge>
                  ))}
                </dd>
                <dt className="text-fg-muted">已注册节点</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {engineInfo.data.nodeTypes.map((type) => (
                    <Badge key={type}>{type}</Badge>
                  ))}
                </dd>
              </dl>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
