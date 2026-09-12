import { useT } from "@/stores/ui";

import { Spinner } from "../primitives/spinner";

interface LoadingStateProps {
  label?: string;
}

/** 页面/区块加载态。旋转环用 token 描边，减弱动画时会被全局规则压掉。 */
export function LoadingState({ label }: LoadingStateProps) {
  const t = useT();
  const text = label ?? t("engine.starting");
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center animate-fade">
      <Spinner size="md" label={text} />
      <p className="text-sm text-fg-muted">{text}</p>
    </div>
  );
}
