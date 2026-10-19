import { layoutMindTree, stepsToMindTree } from "@/lib/mind-map";
import { useEditorStore } from "@/stores/editor";
import { useT } from "@/stores/ui";

/** 只读思维导图：从当前 steps 投影，不作为编辑真源。 */
export function MindMapPreview() {
  const t = useT();
  const steps = useEditorStore((s) => s.steps);
  const match = useEditorStore((s) => s.match);
  const locate = useEditorStore((s) => s.locate);
  const selectStep = useEditorStore((s) => s.selectStep);
  const selectedStepId = useEditorStore((s) => s.selectedStepId);

  const tree = stepsToMindTree({
    name: t("edit.mind.root"),
    match,
    locate,
    steps,
  });
  const layout = layoutMindTree(tree);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="px-4 pt-3 text-xs text-fg-muted">{t("edit.mind.hint")}</p>
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pt-2">
        <svg
          role="img"
          aria-label={t("edit.mind.title")}
          width={layout.width}
          height={layout.height}
          className="block min-w-full"
        >
          {layout.edges.map((edge) => (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              className="stroke-line"
              strokeWidth={1.5}
            />
          ))}
          {layout.nodes.map((node) => {
            const selected = node.stepId !== undefined && node.stepId === selectedStepId;
            return (
              <g
                key={node.id}
                transform={`translate(${String(node.x)}, ${String(node.y)})`}
                className={node.stepId ? "cursor-pointer" : undefined}
                onClick={() => {
                  if (node.stepId) selectStep(node.stepId);
                }}
              >
                <rect
                  width={132}
                  height={40}
                  rx={10}
                  className={
                    selected
                      ? "fill-accent-soft stroke-accent"
                      : "fill-surface-raised stroke-line"
                  }
                  strokeWidth={1}
                />
                <text x={10} y={16} className="fill-fg-faint text-[10px]">
                  {node.kind}
                </text>
                <text x={10} y={30} className="fill-fg text-[12px]">
                  {node.label.length > 12 ? `${node.label.slice(0, 12)}…` : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
