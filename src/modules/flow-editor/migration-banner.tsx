import { useEditorStore } from "@/stores/editor";
import { useT } from "@/stores/ui";
import { Button } from "@/ui";

/** 打开旧版流程后提示已迁移；关掉即清。 */
export function MigrationBanner() {
  const t = useT();
  const lastMigration = useEditorStore((s) => s.lastMigration);
  const clearMigration = useEditorStore((s) => s.clearMigration);
  if (!lastMigration) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-accent/40 bg-accent-soft px-3 py-2 text-xs text-fg">
      <span>
        {t("edit.migration", { from: lastMigration.from, to: lastMigration.to })}
      </span>
      <Button variant="ghost" size="sm" onClick={clearMigration}>
        {t("edit.migration.dismiss")}
      </Button>
    </div>
  );
}
