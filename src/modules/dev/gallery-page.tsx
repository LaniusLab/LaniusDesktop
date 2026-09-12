import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useT } from "@/stores/ui";
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Chip,
  ChoiceGroup,
  Collapsible,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  CopyButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Draggable,
  EmptyState,
  ErrorState,
  FileField,
  FormField,
  Input,
  Kbd,
  KeyRecorder,
  Label,
  LoadingState,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  NumberField,
  Overlay,
  PageHeader,
  Pagination,
  Progress,
  Radio,
  RadioGroup,
  ScrollArea,
  SearchField,
  Select,
  Separator,
  SettingRow,
  Skeleton,
  Slider,
  Spinner,
  SplitPane,
  StatusBadge,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
  Toast,
  ToastStack,
  Toggle,
  ToggleGroup,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type ToastItem,
} from "@/ui";

import { filterGalleryGroups, GALLERY_GROUPS } from "./gallery-catalog";

/** 组件页，替代 Storybook，见 ADR-0006。新增 UI 原语时请同步补目录与区块。 */
export function GalleryPage() {
  const t = useT();
  const contentRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("");
  const [activeId, setActiveId] = useState("button");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [switched, setSwitched] = useState(true);
  const [tab, setTab] = useState("a");
  const [choice, setChoice] = useState("paper");
  const [pressed, setPressed] = useState(true);
  const [density, setDensity] = useState<string | null>("comfortable");
  const [formats, setFormats] = useState<string[]>(["bold"]);
  const [chipOn, setChipOn] = useState(true);
  const [chips, setChips] = useState(["Windows", "记事本"]);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState<number | null>(600);
  const [slider, setSlider] = useState(40);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState("a");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [page, setPage] = useState(2);
  const [picked, setPicked] = useState<File[]>([]);
  const [shortcut, setShortcut] = useState("Mod+K");
  const [name, setName] = useState("每日报表导出");
  const [notes, setNotes] = useState("");
  const [selectValue, setSelectValue] = useState("run");
  const [advancedOpen, setAdvancedOpen] = useState(true);

  const groups = useMemo(
    () => filterGalleryGroups(GALLERY_GROUPS, filter, (key) => t(key)),
    [filter, t],
  );

  useEffect(() => {
    const root = contentRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-gallery-section]");
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);
        const top = visible[0];
        if (!top) return;
        const id = top.target.getAttribute("data-gallery-section");
        if (id) setActiveId(id);
      },
      { root, rootMargin: "0px 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [groups]);

  const goTo = (id: string) => {
    setActiveId(id);
    const node = contentRef.current?.querySelector(`#gallery-${id}`);
    if (node instanceof HTMLElement) node.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const pushToast = (tone: ToastItem["tone"], title: string) => {
    setToasts((list) => [...list, { id: `toast-${String(list.length + 1)}`, title, tone }]);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t("gallery.title")} description={t("gallery.description")} />
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t("gallery.nav")}
          className="flex w-56 shrink-0 flex-col border-r border-line"
        >
          <div className="p-3">
            <SearchField
              value={filter}
              onValueChange={setFilter}
              aria-label={t("gallery.filter")}
              placeholder={t("gallery.filter")}
              clearLabel={t("gallery.filterClear")}
            />
          </div>
          <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
            {groups.length === 0 ? null : (
              groups.map((group) => (
                <div key={group.id} className="mb-3">
                  <p className="px-2 py-1 text-[0.7rem] font-medium tracking-wide text-fg-faint uppercase">
                    {t(group.titleKey)}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const active = item.id === activeId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-current={active ? "true" : undefined}
                          onClick={() => goTo(item.id)}
                          className={cn(
                            "rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-150",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                            active
                              ? "bg-accent-soft text-fg shadow-soft"
                              : "text-fg-muted hover:bg-fg/5 hover:text-fg",
                          )}
                        >
                          {item.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </nav>

        <div ref={contentRef} className="min-h-0 flex-1 overflow-auto px-6 py-6">
          {groups.length === 0 ? (
            <EmptyState title={t("gallery.filterEmpty")} description={t("gallery.filterHint")} />
          ) : (
            <div className="flex max-w-4xl flex-col gap-10">
              {hasItem(groups, "button") ? (
                <GallerySection id="button" title="Button">
                  <Example label="变体">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button>主要</Button>
                      <Button variant="secondary">次要</Button>
                      <Button variant="ghost">幽灵</Button>
                      <Button variant="outline">描边</Button>
                      <Button variant="soft">柔和</Button>
                      <Button variant="danger">危险</Button>
                    </div>
                  </Example>
                  <Example label="尺寸 / 图标 / 禁用">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="sm">小尺寸</Button>
                      <Button size="lg">大尺寸</Button>
                      <Button size="icon" aria-label="添加">
                        <Plus />
                      </Button>
                      <Button disabled>禁用</Button>
                    </div>
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "toggle") ? (
                <GallerySection id="toggle" title="Toggle / Chip">
                  <Example label="开关与单选分组">
                    <div className="flex flex-wrap items-center gap-3">
                      <Toggle pressed={pressed} onPressedChange={setPressed}>
                        粗体
                      </Toggle>
                      <Toggle pressed={false} disabled onPressedChange={() => {}}>
                        禁用
                      </Toggle>
                      <ToggleGroup
                        value={density}
                        onValueChange={setDensity}
                        aria-label="密度"
                        items={[
                          { value: "compact", label: "紧凑" },
                          { value: "comfortable", label: "适中" },
                          { value: "loose", label: "宽松" },
                        ]}
                      />
                    </div>
                  </Example>
                  <Example label="多选分组">
                    <ToggleGroup
                      type="multiple"
                      value={formats}
                      onValueChange={setFormats}
                      aria-label="格式"
                      items={[
                        { value: "bold", label: "粗体" },
                        { value: "italic", label: "斜体" },
                        { value: "underline", label: "下划线" },
                      ]}
                    />
                  </Example>
                  <Example label="标签">
                    <div className="flex flex-wrap gap-2">
                      <Chip selected={chipOn} onSelect={() => setChipOn((value) => !value)}>
                        可选中
                      </Chip>
                      <Chip>只读</Chip>
                      <Chip disabled>禁用</Chip>
                      {chips.map((chip) => (
                        <Chip
                          key={chip}
                          onRemove={() => setChips((list) => list.filter((item) => item !== chip))}
                        >
                          {chip}
                        </Chip>
                      ))}
                    </div>
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "menus") ? (
                <GallerySection id="menus" title="Menu / ContextMenu">
                  <Example label="复制与下拉菜单">
                    <div className="flex flex-wrap items-center gap-3">
                      <CopyButton value="lanius.flow.run" />
                      <Menu>
                        <MenuTrigger asChild>
                          <Button variant="outline">操作</Button>
                        </MenuTrigger>
                        <MenuContent align="start">
                          <MenuItem>复制路径</MenuItem>
                          <MenuItem>重命名</MenuItem>
                          <MenuItem disabled>已归档</MenuItem>
                          <MenuSeparator />
                          <MenuItem tone="danger">删除</MenuItem>
                        </MenuContent>
                      </Menu>
                    </div>
                  </Example>
                  <Example label="右键菜单">
                    <ContextMenu>
                      <ContextMenuTrigger className="glass-card cursor-context-menu rounded-xl px-4 py-6 text-sm text-fg-muted">
                        在此区域右键，打开上下文菜单
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem>复制</ContextMenuItem>
                        <ContextMenuItem>重命名</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem tone="danger">删除</ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "input") ? (
                <GallerySection id="input" title="Input / FormField / Label">
                  <FormField label="流程名称" hint="将显示在流程列表与执行历史中">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="例如：每日报表导出"
                    />
                  </FormField>
                  <FormField label="超时时间" error="必须是正整数">
                    <Input placeholder="600000" aria-invalid />
                  </FormField>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="gallery-standalone-input">独立 Label</Label>
                    <Input id="gallery-standalone-input" placeholder="htmlFor 点标签会聚焦输入框" />
                  </div>
                  <FormField label="只读">
                    <Input value="不可改" disabled />
                  </FormField>
                </GallerySection>
              ) : null}

              {hasItem(groups, "fields") ? (
                <GallerySection id="fields" title="SearchField / NumberField / Textarea">
                  <FormField label="搜索">
                    <SearchField value={search} onValueChange={setSearch} placeholder="按名称过滤" />
                  </FormField>
                  <FormField label="超时（秒）">
                    <NumberField value={amount} onValueChange={setAmount} min={0} step={10} />
                  </FormField>
                  <FormField label="备注">
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="补充说明，不会发给引擎"
                    />
                  </FormField>
                </GallerySection>
              ) : null}

              {hasItem(groups, "choice") ? (
                <GallerySection id="choice" title="Checkbox / Radio / Slider">
                  <Example label="勾选与单选">
                    <div className="flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2 text-sm text-fg">
                        <Checkbox checked={checked} onCheckedChange={setChecked} />
                        记录日志
                      </label>
                      <label className="flex items-center gap-2 text-sm text-fg-muted">
                        <Checkbox checked={false} onCheckedChange={() => {}} disabled />
                        禁用
                      </label>
                      <RadioGroup value={radio} onValueChange={setRadio} aria-label="运行模式">
                        <Radio value="a" label="正式跑" />
                        <Radio value="b" label="只检查" />
                        <Radio value="c" label="归档" disabled />
                      </RadioGroup>
                    </div>
                  </Example>
                  <FormField label={`速度 ${String(slider)}`}>
                    <Slider value={slider} onValueChange={setSlider} aria-label="速度" />
                  </FormField>
                  <FormField label="禁用滑块">
                    <Slider value={20} onValueChange={() => {}} disabled aria-label="禁用滑块" />
                  </FormField>
                </GallerySection>
              ) : null}

              {hasItem(groups, "controls") ? (
                <GallerySection id="controls" title="Switch / Select / Tabs">
                  <Example label="开关与下拉">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="gallery-switch"
                          checked={switched}
                          onCheckedChange={setSwitched}
                          aria-label="演示开关"
                        />
                        <Label htmlFor="gallery-switch">演示开关</Label>
                      </div>
                      <Switch checked={false} onCheckedChange={() => {}} disabled aria-label="禁用开关" />
                      <Select
                        aria-label="运行方式"
                        value={selectValue}
                        onChange={(event) => setSelectValue(event.target.value)}
                      >
                        <option value="run">正式跑</option>
                        <option value="check">只检查</option>
                        <option value="dry">预演</option>
                      </Select>
                      <Select aria-label="禁用下拉" defaultValue="a" disabled>
                        <option value="a">A</option>
                        <option value="b">B</option>
                      </Select>
                    </div>
                  </Example>
                  <Example label="选项卡">
                    <Tabs
                      value={tab}
                      onValueChange={setTab}
                      items={[
                        { value: "a", label: "A" },
                        { value: "b", label: "B" },
                        { value: "c", label: "C" },
                      ]}
                    />
                    <p className="text-sm text-fg-muted">
                      {tab === "a" ? "A：外观与主题" : tab === "b" ? "B：编排画布" : "C：调试与日志"}
                    </p>
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "file") ? (
                <GallerySection id="file" title="FileField">
                  <Example label="多选 / 拖放">
                    <FileField files={picked} onFilesChange={setPicked} multiple accept=".txt,.json,image/*" />
                  </Example>
                  <Example label="已选文件">
                    <FileField
                      files={[new File(["demo"], "打开记事本.flow.json", { type: "application/json" })]}
                      onFilesChange={() => {}}
                      accept=".json"
                    />
                  </Example>
                  <Example label="禁用">
                    <FileField files={[]} onFilesChange={() => {}} disabled />
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "recorder") ? (
                <GallerySection id="recorder" title="KeyRecorder / Kbd">
                  <Example label="展示键帽">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                      <Kbd>Ctrl</Kbd>
                      <span>+</span>
                      <Kbd>K</Kbd>
                      <Kbd>Esc</Kbd>
                      <Kbd>↑</Kbd>
                      <Kbd asChild>
                        <button type="button">asChild</button>
                      </Kbd>
                    </div>
                  </Example>
                  <Example label="录制">
                    <div className="flex flex-wrap items-center gap-3">
                      <KeyRecorder
                        value={shortcut}
                        onChange={setShortcut}
                        recordingLabel={t("keymap.recording")}
                        emptyLabel={t("keymap.record")}
                      />
                      <KeyRecorder
                        value="Mod+S"
                        onChange={() => {}}
                        recordingLabel={t("keymap.recording")}
                        emptyLabel={t("keymap.record")}
                        disabled
                      />
                    </div>
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "settings") ? (
                <GallerySection id="settings" title="SettingRow / ChoiceGroup">
                  <Example label="设置行">
                    <div className="flex flex-col gap-2">
                      <SettingRow label="示例开关" description="设置行的标签与说明">
                        <Switch
                          checked={switched}
                          onCheckedChange={setSwitched}
                          aria-label="设置行开关"
                        />
                      </SettingRow>
                      <SettingRow label="快捷键" description="点击键帽后按下组合键">
                        <KeyRecorder
                          value={shortcut}
                          onChange={setShortcut}
                          recordingLabel={t("keymap.recording")}
                          emptyLabel={t("keymap.record")}
                        />
                      </SettingRow>
                    </div>
                  </Example>
                  <Example label="选项卡（带说明）">
                    <ChoiceGroup
                      value={choice}
                      onChange={setChoice}
                      columns={2}
                      aria-label="主题"
                      options={[
                        {
                          value: "paper",
                          label: t("settings.theme.light"),
                          description: "日光石色作业台，适合白天。",
                        },
                        {
                          value: "night",
                          label: t("settings.theme.dark"),
                          description: "午夜锌色，降低亮度。",
                        },
                      ]}
                    />
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "badge") ? (
                <GallerySection id="badge" title="Badge / StatusBadge">
                  <Example label="色调">
                    <div className="flex flex-wrap gap-2">
                      <Badge>中性</Badge>
                      <Badge tone="accent">强调</Badge>
                      <Badge tone="info">信息</Badge>
                      <Badge tone="success">成功</Badge>
                      <Badge tone="warning">警告</Badge>
                      <Badge tone="danger">危险</Badge>
                    </div>
                  </Example>
                  <Example label="执行状态机">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge state="idle" />
                      <StatusBadge state="validating" />
                      <StatusBadge state="running" />
                      <StatusBadge state="paused" />
                      <StatusBadge state="done" />
                      <StatusBadge state="failed" />
                      <StatusBadge state="cancelled" />
                    </div>
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "card") ? (
                <GallerySection id="card" title="Card">
                  <Card className="max-w-md">
                    <CardHeader>
                      <CardTitle>打开记事本</CardTitle>
                      <CardDescription>预设卡片：标题、说明、操作排在同一张卡上。</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-fg-muted">找到窗口 → 输入一段文字 → 保存。</p>
                    </CardContent>
                    <CardFooter>
                      <Button size="sm">试一次</Button>
                      <Button size="sm" variant="ghost">
                        自己改步骤
                      </Button>
                    </CardFooter>
                  </Card>
                </GallerySection>
              ) : null}

              {hasItem(groups, "feedback") ? (
                <GallerySection id="feedback" title="Alert / Toast / Progress">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Alert title="引擎已连接" tone="success">
                      sidecar 就绪，可以试一次。
                    </Alert>
                    <Alert title="缺少目标窗口" tone="warning">
                      先完成「找到窗口」，再跑后面的步骤。
                    </Alert>
                    <Alert title="调试说明" tone="info">
                      默认界面不展示 traceId。
                    </Alert>
                    <Alert title="无法写入记录" tone="danger">
                      目标目录没有写入权限。
                    </Alert>
                  </div>
                  <Example label="即时提示">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => pushToast("info", "已记下一条日志")}>
                        信息
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => pushToast("success", "已保存")}>
                        成功
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => pushToast("warning", "窗口未找到")}>
                        警告
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => pushToast("danger", "执行失败")}>
                        失败
                      </Button>
                    </div>
                    <Toast title="静态提示" description="不走队列，给属性面板用。" />
                    <ToastStack
                      items={toasts}
                      onDismiss={(id) => setToasts((list) => list.filter((item) => item.id !== id))}
                    />
                  </Example>
                  <Example label="进度 0 / 62 / 100">
                    <div className="flex flex-col gap-3">
                      <Progress value={0} label="未开始" />
                      <Progress value={62} label="演示进度" />
                      <Progress value={100} label="已完成" />
                    </div>
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "placeholders") ? (
                <GallerySection id="placeholders" title="Avatar / Skeleton / Spinner">
                  <Example label="头像">
                    <div className="flex flex-wrap items-center gap-4">
                      <Avatar initials="S" alt="小" size="sm" />
                      <Avatar initials="LA" alt="Lanius" />
                      <Avatar initials="LN" alt="大" size="lg" />
                    </div>
                  </Example>
                  <Example label="骨架">
                    <div className="flex flex-wrap items-center gap-4">
                      <Skeleton className="size-9 rounded-full" />
                      <Skeleton className="h-8 w-40" />
                      <Skeleton className="h-16 w-full max-w-xs" />
                    </div>
                  </Example>
                  <Example label="旋转环">
                    <div className="flex flex-wrap items-center gap-4">
                      <Spinner size="sm" label="加载中" />
                      <Spinner size="md" label="加载中" />
                      <Spinner size="lg" label="加载中" />
                    </div>
                  </Example>
                </GallerySection>
              ) : null}

              {hasItem(groups, "flow") ? (
                <GallerySection id="flow" title="Breadcrumb / Stepper / Separator">
                  <Breadcrumb
                    items={[
                      { label: "开始", onClick: () => {} },
                      { label: "编辑", onClick: () => {} },
                      { label: "打开记事本" },
                    ]}
                  />
                  <Stepper
                    current={1}
                    steps={[
                      { label: "校验", description: "检查缺项" },
                      { label: "运行", description: "按步骤执行" },
                      { label: "完成", description: "写入记录" },
                    ]}
                  />
                  <div className="flex h-8 items-center gap-3 text-sm text-fg-muted">
                    左
                    <Separator orientation="vertical" />
                    中
                    <Separator orientation="vertical" />
                    右
                  </div>
                  <Separator />
                </GallerySection>
              ) : null}

              {hasItem(groups, "table") ? (
                <GallerySection id="table" title="Table / Pagination">
                  <Table>
                    <TableCaption>演示行，不是真实执行记录</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>耗时</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>打开记事本</TableCell>
                        <TableCell>
                          <StatusBadge state="done" />
                        </TableCell>
                        <TableCell>1.2s</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>输入一段文字</TableCell>
                        <TableCell>
                          <StatusBadge state="running" />
                        </TableCell>
                        <TableCell>—</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>保存文件</TableCell>
                        <TableCell>
                          <StatusBadge state="failed" />
                        </TableCell>
                        <TableCell>0.4s</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <Pagination page={page} pageCount={8} onPageChange={setPage} />
                </GallerySection>
              ) : null}

              {hasItem(groups, "scroll") ? (
                <GallerySection id="scroll" title="ScrollArea / Collapsible">
                  <ScrollArea className="h-24 rounded-xl border border-line px-3 py-2 text-sm text-fg-muted">
                    滚动区域包一层视口和滚动条。下面几行用来看出溢出。
                    <p className="mt-2">第二行：找到窗口</p>
                    <p className="mt-2">第三行：输入一段文字</p>
                    <p className="mt-2">第四行：保存</p>
                    <p className="mt-2">第五行：记下一条日志</p>
                  </ScrollArea>
                  <Collapsible title="高级选项" open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    折叠面板给设置分组和属性表用。
                  </Collapsible>
                  <Collapsible title="默认收起">
                    关闭时内容仍在 DOM 里，只是隐藏。
                  </Collapsible>
                </GallerySection>
              ) : null}

              {hasItem(groups, "split") ? (
                <GallerySection id="split" title="SplitPane / Draggable">
                  <Example label="左右分栏">
                    <div className="h-36">
                      <SplitPane label="调整宽度" defaultSize={140} min={80} minSecond={80}>
                        <div className="glass-card flex h-full items-center justify-center rounded-xl text-sm text-fg-muted">
                          左栏
                        </div>
                        <div className="glass-card flex h-full items-center justify-center rounded-xl text-sm text-fg-muted">
                          右栏
                        </div>
                      </SplitPane>
                    </div>
                  </Example>
                  <Example label="上下分栏">
                    <div className="h-44">
                      <SplitPane
                        orientation="vertical"
                        label="调整高度"
                        defaultSize={88}
                        min={56}
                        minSecond={56}
                      >
                        <div className="glass-card flex h-full items-center justify-center rounded-xl text-sm text-fg-muted">
                          上栏
                        </div>
                        <div className="glass-card flex h-full items-center justify-center rounded-xl text-sm text-fg-muted">
                          下栏
                        </div>
                      </SplitPane>
                    </div>
                  </Example>
                  <Draggable className="w-fit">
                    <Card className="cursor-grab px-4 py-3 active:cursor-grabbing">
                      <CardContent className="p-0 text-sm text-fg-muted">拖动这块卡片</CardContent>
                    </Card>
                  </Draggable>
                </GallerySection>
              ) : null}

              {hasItem(groups, "dialog") ? (
                <GallerySection id="dialog" title="Tooltip / Dialog / Overlay">
                  <div className="flex flex-wrap items-center gap-3">
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
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                            取消
                          </Button>
                          <Button variant="danger" onClick={() => setDialogOpen(false)}>
                            确认执行
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={() => setOverlayOpen(true)}>
                      打开 Overlay
                    </Button>
                    <Overlay open={overlayOpen} onOpenChange={setOverlayOpen} title="示例浮层">
                      <div className="p-4">
                        <p className="text-sm text-fg">给全局搜索用的自研层，不走 Radix Dialog。</p>
                        <Button className="mt-3" size="sm" onClick={() => setOverlayOpen(false)}>
                          关闭
                        </Button>
                      </div>
                    </Overlay>
                  </div>
                </GallerySection>
              ) : null}

              {hasItem(groups, "page-header") ? (
                <GallerySection id="page-header" title="PageHeader">
                  <div className="overflow-hidden rounded-xl border border-line">
                    <PageHeader
                      title="打开记事本"
                      description="找到窗口，输入一段文字，再保存。"
                      actions={
                        <>
                          <Button size="sm" variant="secondary">
                            自己改步骤
                          </Button>
                          <Button size="sm">试一次</Button>
                        </>
                      }
                    />
                  </div>
                </GallerySection>
              ) : null}

              {hasItem(groups, "states") ? (
                <GallerySection id="states" title="EmptyState / ErrorState / LoadingState">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="glass-card rounded-xl">
                      <EmptyState
                        title="暂无流程"
                        description="点击右上角新建你的第一个自动化流程。"
                        action={
                          <Button size="sm">
                            <Plus />
                            新建流程
                          </Button>
                        }
                      />
                    </div>
                    <div className="glass-card rounded-xl">
                      <ErrorState
                        title="引擎连接失败"
                        description="sidecar 进程退出，已自动重启 3 次仍未恢复。"
                        traceId="01J8ZX7E9Q0M4V2K6N8P3R5T7W"
                        onRetry={() => {}}
                      />
                    </div>
                    <div className="glass-card rounded-xl">
                      <LoadingState label="正在加载节点注册表…" />
                    </div>
                  </div>
                </GallerySection>
              ) : null}

              <p className="pb-6 text-xs text-fg-faint">{t("gallery.footer")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function hasItem(groups: readonly { items: readonly { id: string }[] }[], id: string): boolean {
  return groups.some((group) => group.items.some((item) => item.id === id));
}

function GallerySection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={`gallery-${id}`} data-gallery-section={id} className="scroll-mt-4">
      <h2 className="mb-3 text-sm font-semibold text-fg">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Example({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-fg-faint">{label}</p>
      {children}
    </div>
  );
}
