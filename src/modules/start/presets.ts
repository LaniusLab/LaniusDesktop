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

/** M0 写死的作业预设，与演示流程同一语义；M2 改为 *.flow.json 投影 */
export const JOB_PRESETS: JobPreset[] = [
  {
    id: "notepad-sentence",
    title: "给记事本写一句话",
    summary: "找到记事本，写下一句话，并记下已经做完。",
    available: true,
    steps: [
      { id: "open_app", label: "定位记事本" },
      { id: "type_text", label: "输入内容" },
      { id: "log_done", label: "记下完成" },
    ],
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
