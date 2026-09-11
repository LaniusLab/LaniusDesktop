import { useState } from "react";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  PageHeader,
  Separator,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/ui";

/** 组件库活文档（dev-only 路由 /dev/gallery），替代 Storybook，见 ADR-0006 */
export function GalleryPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="组件画廊" description="src/ui 全部组件与状态变体的活文档（仅开发环境）" />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="flex max-w-3xl flex-col gap-8">
          <GallerySection title="Button">
            <div className="flex flex-wrap items-center gap-3">
              <Button>主要</Button>
              <Button variant="secondary">次要</Button>
              <Button variant="ghost">幽灵</Button>
              <Button variant="outline">描边</Button>
              <Button variant="danger">危险</Button>
              <Button disabled>禁用</Button>
              <Button size="sm">小尺寸</Button>
              <Button size="lg">大尺寸</Button>
            </div>
          </GallerySection>

          <GallerySection title="Badge">
            <div className="flex flex-wrap gap-2">
              <Badge>中性</Badge>
              <Badge tone="accent">强调</Badge>
              <Badge tone="success">成功</Badge>
              <Badge tone="warning">警告</Badge>
              <Badge tone="danger">危险</Badge>
            </div>
          </GallerySection>

          <GallerySection title="StatusBadge（执行状态机）">
            <div className="flex flex-wrap gap-2">
              <StatusBadge state="idle" />
              <StatusBadge state="validating" />
              <StatusBadge state="running" />
              <StatusBadge state="paused" />
              <StatusBadge state="done" />
              <StatusBadge state="failed" />
              <StatusBadge state="cancelled" />
            </div>
          </GallerySection>

          <GallerySection title="Input / FormField">
            <FormField label="流程名称" hint="将显示在流程列表与执行历史中">
              <Input placeholder="例如：每日报表导出" />
            </FormField>
            <FormField label="超时时间" error="必须是正整数">
              <Input placeholder="600000" aria-invalid />
            </FormField>
          </GallerySection>

          <GallerySection title="Tooltip / Dialog">
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">悬停查看提示</Button>
                </TooltipTrigger>
                <TooltipContent>这是一条提示</TooltipContent>
              </Tooltip>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">打开对话框</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>确认危险操作</DialogTitle>
                    <DialogDescription>
                      危险节点执行前的二次确认对话框将基于此组件构建，见 docs/SECURITY.md §5。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                      取消
                    </Button>
                    <Button variant="danger" onClick={() => setDialogOpen(false)}>
                      确认执行
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </GallerySection>

          <GallerySection title="EmptyState / ErrorState">
            <div className="grid gap-4 rounded-lg border border-line md:grid-cols-2">
              <EmptyState title="暂无流程" description="点击右上角新建你的第一个自动化流程。" />
              <ErrorState
                title="引擎连接失败"
                description="sidecar 进程退出，已自动重启 3 次仍未恢复。"
                traceId="01J8ZX7E9Q0M4V2K6N8P3R5T7W"
                onRetry={() => {}}
              />
            </div>
          </GallerySection>

          <Separator />
          <p className="pb-6 text-xs text-fg-faint">
            新增组件后请同步补充本页对应区块，保持活文档与实现一致。
          </p>
        </div>
      </div>
    </div>
  );
}

function GallerySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-fg">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
