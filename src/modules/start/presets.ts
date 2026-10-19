import { processById } from "@/lib/targets";
import { createNotepadMultilineSteps, type TemplateStep } from "@/lib/template";
import type { StoredTemplate } from "@/lib/template-store";

export interface JobStep {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface JobPreset {
  id: string;
  title: string;
  summary: string;
  available: boolean;
  laterHint?: string;
  steps: JobStep[];
  /** 选中时写入编辑器的完整模板片段 */
  load?: () => Pick<StoredTemplate, "steps" | "processId" | "match" | "locate"> & {
    keymapProfileId?: string;
  };
}

function asJobSteps(steps: TemplateStep[]): JobStep[] {
  return steps.map((step) => ({ id: step.id, label: step.label, disabled: step.disabled }));
}

/** M0 作业列表。记事本多行输入为默认冒烟预设。 */
export const JOB_PRESETS: JobPreset[] = [
  {
    id: "notepad-multiline",
    title: "记事本多行输入",
    summary: "选定记事本窗口后，输入多行预设文本。用于冒烟与演示。",
    available: true,
    steps: asJobSteps(createNotepadMultilineSteps()),
    load: () => {
      const notepad = processById("notepad");
      return {
        steps: createNotepadMultilineSteps(),
        processId: notepad?.id ?? "notepad",
        match: notepad?.match ?? { exe: "notepad.exe", title: "无标题 - 记事本", className: "Notepad" },
        locate: notepad?.recommended ?? {
          channel: "a11y",
          source: "probe",
          capture: "client",
          visionPack: "template",
        },
        keymapProfileId: "default",
      };
    },
  },
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
