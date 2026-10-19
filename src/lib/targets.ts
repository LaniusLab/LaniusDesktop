/** 开跑时的进程列表与定位通道探测。M0 为本地目录；真枚举属 M4。 */

export type LocateChannel = "a11y" | "vision";
export type LocateSource = "probe" | "user";
export type CaptureMode = "client" | "screen";

export interface TargetMatch {
  exe: string;
  title: string;
  className: string;
}

export interface LocateProfile {
  channel: LocateChannel;
  source: LocateSource;
  capture: CaptureMode;
  visionPack: string;
}

export interface ProcessOption {
  id: string;
  name: string;
  match: TargetMatch;
  recommended: LocateProfile;
  reasons: readonly string[];
}

export const PROCESS_CATALOG: readonly ProcessOption[] = [
  {
    id: "notepad",
    name: "记事本",
    match: { exe: "notepad.exe", title: "无标题 - 记事本", className: "Notepad" },
    recommended: {
      channel: "a11y",
      source: "probe",
      capture: "client",
      visionPack: "template",
    },
    reasons: ["窗口类 Notepad", "控件树可用"],
  },
  {
    id: "client",
    name: "自绘客户端",
    match: { exe: "client.exe", title: "客户端", className: "UnityWndClass" },
    recommended: {
      channel: "vision",
      source: "probe",
      capture: "client",
      visionPack: "template",
    },
    reasons: ["窗口类 UnityWndClass", "控件树几乎为空"],
  },
];

export function processById(id: string): ProcessOption | undefined {
  return PROCESS_CATALOG.find((item) => item.id === id);
}

export function probeLocate(processId: string): LocateProfile | undefined {
  return processById(processId)?.recommended;
}
