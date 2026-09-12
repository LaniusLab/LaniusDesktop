export interface GalleryItem {
  id: string;
  title: string;
  keywords: readonly string[];
}

export interface GalleryGroup {
  id: string;
  titleKey: string;
  items: readonly GalleryItem[];
}

/** 组件页目录。title 用组件名，keywords 供中英过滤。 */
export const GALLERY_GROUPS: readonly GalleryGroup[] = [
  {
    id: "actions",
    titleKey: "gallery.group.actions",
    items: [
      { id: "button", title: "Button", keywords: ["按钮", "button"] },
      { id: "toggle", title: "Toggle / Chip", keywords: ["开关", "标签", "toggle", "chip"] },
      { id: "menus", title: "Menu / ContextMenu", keywords: ["菜单", "右键", "复制", "menu"] },
    ],
  },
  {
    id: "form",
    titleKey: "gallery.group.form",
    items: [
      { id: "input", title: "Input / FormField / Label", keywords: ["输入", "表单", "标签", "input", "label"] },
      { id: "fields", title: "SearchField / NumberField / Textarea", keywords: ["搜索", "数字", "多行", "search"] },
      { id: "choice", title: "Checkbox / Radio / Slider", keywords: ["复选", "单选", "滑块", "checkbox"] },
      { id: "controls", title: "Switch / Select / Tabs", keywords: ["开关", "下拉", "选项卡", "switch", "select", "tabs"] },
      { id: "file", title: "FileField", keywords: ["文件", "file"] },
      { id: "recorder", title: "KeyRecorder / Kbd", keywords: ["按键", "快捷键", "键盘", "kbd"] },
      { id: "settings", title: "SettingRow / ChoiceGroup", keywords: ["设置", "选项组", "setting"] },
    ],
  },
  {
    id: "display",
    titleKey: "gallery.group.display",
    items: [
      { id: "badge", title: "Badge / StatusBadge", keywords: ["徽章", "状态", "badge"] },
      { id: "card", title: "Card", keywords: ["卡片", "card"] },
      { id: "feedback", title: "Alert / Toast / Progress", keywords: ["提示", "进度", "alert", "toast"] },
      { id: "placeholders", title: "Avatar / Skeleton / Spinner", keywords: ["头像", "骨架", "加载", "avatar"] },
    ],
  },
  {
    id: "nav",
    titleKey: "gallery.group.nav",
    items: [
      { id: "flow", title: "Breadcrumb / Stepper / Separator", keywords: ["路径", "步骤", "分隔", "breadcrumb"] },
      { id: "table", title: "Table / Pagination", keywords: ["表格", "分页", "table"] },
    ],
  },
  {
    id: "layout",
    titleKey: "gallery.group.layout",
    items: [
      { id: "scroll", title: "ScrollArea / Collapsible", keywords: ["滚动", "折叠", "scroll"] },
      { id: "split", title: "SplitPane / Draggable", keywords: ["分栏", "拖拽", "split"] },
    ],
  },
  {
    id: "overlay",
    titleKey: "gallery.group.overlay",
    items: [
      { id: "dialog", title: "Tooltip / Dialog / Overlay", keywords: ["浮层", "对话框", "提示", "dialog", "overlay"] },
    ],
  },
  {
    id: "state",
    titleKey: "gallery.group.state",
    items: [
      { id: "page-header", title: "PageHeader", keywords: ["页头", "标题", "header", "page"] },
      { id: "states", title: "EmptyState / ErrorState / LoadingState", keywords: ["空", "错误", "加载", "empty"] },
    ],
  },
];

export function filterGalleryGroups(
  groups: readonly GalleryGroup[],
  query: string,
  groupTitle: (titleKey: string) => string,
): GalleryGroup[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [...groups];

  const result: GalleryGroup[] = [];
  for (const group of groups) {
    const heading = groupTitle(group.titleKey).toLowerCase();
    const items = group.items.filter((item) => {
      if (item.title.toLowerCase().includes(needle) || heading.includes(needle)) return true;
      return item.keywords.some((word) => word.toLowerCase().includes(needle));
    });
    if (items.length > 0) result.push({ ...group, items });
  }
  return result;
}
