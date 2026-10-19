import { useValidationStore } from "@/stores/validation";
import { useEditorStore } from "@/stores/editor";
import { useT } from "@/stores/ui";
import { Badge } from "@/ui";

/** 校验 issue 列表：点一条选中对应步骤。 */
export function ValidationIssueList() {
  const t = useT();
  const issues = useValidationStore((s) => s.issues);
  const selectStep = useEditorStore((s) => s.selectStep);

  if (issues.length === 0) return null;

  return (
    <div className="border-b border-line bg-danger/5 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-2">
        <Badge tone="danger">{t("edit.issue.badge")}</Badge>
        <span className="text-xs text-fg-muted">{t("edit.issue.listHint", { count: issues.length })}</span>
      </div>
      <ul className="flex max-h-24 flex-col gap-1 overflow-auto">
        {issues.map((issue, index) => (
          <li key={`${issue.nodeId ?? "flow"}-${issue.code}-${String(index)}`}>
            <button
              type="button"
              className="w-full truncate rounded-md px-1.5 py-1 text-left text-xs text-danger hover:bg-danger/10"
              onClick={() => {
                if (issue.nodeId) selectStep(issue.nodeId);
              }}
              title={issue.message}
            >
              {issue.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
