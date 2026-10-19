import { useEffect, useRef } from "react";

import { bridge } from "@/lib/bridge";
import { editorToFlowFile, useEditorStore } from "@/stores/editor";
import { useValidationStore } from "@/stores/validation";

const DEBOUNCE_MS = 280;

/** 编辑器步骤变更后防抖调用 `flow.validate`，结果钉到 validation store。 */
export function useFlowValidation(): void {
  const steps = useEditorStore((s) => s.steps);
  const match = useEditorStore((s) => s.match);
  const locate = useEditorStore((s) => s.locate);
  const keymapProfileId = useEditorStore((s) => s.keymapProfileId);
  const flowId = useEditorStore((s) => s.flowId);
  const flowName = useEditorStore((s) => s.flowName);
  const setResult = useValidationStore((s) => s.setResult);
  const seq = useRef(0);

  useEffect(() => {
    const token = ++seq.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await bridge.flowValidate(editorToFlowFile());
          if (token !== seq.current) return;
          setResult(result.ok, result.issues);
        } catch {
          if (token !== seq.current) return;
          // 引擎未就绪时保留本地即时校验（stepIssueKey），不覆盖为假 ok
        }
      })();
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [steps, match, locate, keymapProfileId, flowId, flowName, setResult]);
}
