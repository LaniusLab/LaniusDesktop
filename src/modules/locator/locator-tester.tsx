import { useState } from "react";

import { bridge } from "@/lib/bridge";
import type { DriverElementFindResult, Locator } from "@/lib/gen/element-locator";
import type { LocateProfile, TargetMatch } from "@/lib/targets";
import { useT } from "@/stores/ui";
import { Alert, Button, Input } from "@/ui";

export interface LocatorTesterProps {
  match: TargetMatch;
  locate: LocateProfile;
}

/** 选择器测试器：对当前 target.match / locate 试一次 find_element（不点击）。 */
export function LocatorTester({ match, locate }: LocatorTesterProps) {
  const t = useT();
  const [name, setName] = useState("");
  const [automationId, setAutomationId] = useState("");
  const [controlType, setControlType] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DriverElementFindResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runTest() {
    const locator: Locator = {};
    const n = name.trim();
    const a = automationId.trim();
    const c = controlType.trim();
    if (n) locator.name = n;
    if (a) locator.automationId = a;
    if (c) locator.controlType = c;
    setPending(true);
    setResult(null);
    setErrorMessage(null);
    try {
      const next = await bridge.elementFind({
        match: {
          exe: match.exe || undefined,
          title: match.title || undefined,
          className: match.className || undefined,
        },
        locate: {
          channel: locate.channel,
          source: locate.source,
          capture: locate.capture,
          visionPack: locate.visionPack,
        },
        locator,
      });
      setResult(next);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-line px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-fg">{t("locator.title")}</p>
        <p className="text-xs text-fg-muted">{t("locator.hint")}</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-muted">{t("locator.name")}</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("locator.namePh")}
            aria-label={t("locator.name")}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-muted">{t("locator.automationId")}</span>
          <Input
            value={automationId}
            onChange={(e) => setAutomationId(e.target.value)}
            placeholder={t("locator.automationIdPh")}
            aria-label={t("locator.automationId")}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-muted">{t("locator.controlType")}</span>
          <Input
            value={controlType}
            onChange={(e) => setControlType(e.target.value)}
            placeholder={t("locator.controlTypePh")}
            aria-label={t("locator.controlType")}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => void runTest()}>
          {pending ? t("locator.testing") : t("locator.test")}
        </Button>
        <span className="text-xs text-fg-faint">
          {match.exe || match.title || match.className || t("locator.noMatch")}
        </span>
      </div>
      {result ? (
        <Alert tone="success" className="mt-3" title={t("locator.found")}>
          {t("locator.resultOk", {
            handle: result.handle,
            elementId: result.elementId,
            name: result.summary.name || "—",
          })}
        </Alert>
      ) : null}
      {errorMessage ? (
        <Alert tone="danger" className="mt-3" title={t("locator.failed")}>
          {errorMessage}
        </Alert>
      ) : null}
    </div>
  );
}
