export interface JobStep {
  id: string;
  label: string;
}

export interface JobPreset {
  id: string;
  title: string;
  summary: string;
  available: boolean;
  laterHint?: string;
  steps: JobStep[];
}

/** M0 作业列表。可用项的步骤与模板编辑器同一份 store。 */
export const JOB_PRESETS: JobPreset[] = [
  {
    id: "window-template",
    title: "对选定窗口跑模板",
    summary: "选进程，确认识别方式，然后按模板里的按键、鼠标和预设操作执行。",
    available: true,
    steps: [],
  },
  {
    id: "sort-downloads",
    title: "整理下载文件夹",
    summary: "按类型把下载里的文件归位。",
    available: false,
    laterHint: "稍后",
    steps: [],
  },
  {
    id: "backup-desktop",
    title: "每天备份桌面",
    summary: "把桌面上的文件复制到备份目录。",
    available: false,
    laterHint: "稍后",
    steps: [],
  },
];
