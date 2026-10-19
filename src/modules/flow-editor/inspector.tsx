import {
  configNumber,
  configString,
  findStepById,
  stepIssueKey,
  type TemplateStep,
} from "@/lib/template";
import { useEditorStore } from "@/stores/editor";
import { useT } from "@/stores/ui";
import { EmptyState, FormField, Input, NumberField, Select, Switch, Textarea } from "@/ui";

/** 点选步骤后改必填项；表达式与完整 schema 表单仍属后续。 */
export function TemplateInspector() {
  const t = useT();
  const steps = useEditorStore((s) => s.steps);
  const selectedStepId = useEditorStore((s) => s.selectedStepId);
  const patchStep = useEditorStore((s) => s.patchStep);
  const setStepDisabled = useEditorStore((s) => s.setStepDisabled);
  const step = selectedStepId ? findStepById(steps, selectedStepId) : undefined;

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <EmptyState title={t("edit.inspector.empty")} description={t("edit.inspector.emptyHint")} />
      </div>
    );
  }

  const issue = stepIssueKey(step);
  const patchConfig = (key: string, value: unknown) => {
    patchStep(step.id, { config: { ...step.config, [key]: value } });
  };

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-auto bg-glass px-3 py-4 backdrop-blur-md">
      <p className="px-1 font-display text-sm text-fg">{t("edit.inspector")}</p>
      {issue ? <p className="px-1 text-xs text-danger">{t(issue)}</p> : null}

      <FormField label={t("edit.field.label")} htmlFor="step-label">
        <Input
          id="step-label"
          value={step.label}
          onChange={(event) => patchStep(step.id, { label: event.target.value })}
        />
      </FormField>

      <FormField label={t("edit.field.skip")} htmlFor="step-skip" hint={t("edit.field.skipHint")}>
        <Switch
          id="step-skip"
          checked={Boolean(step.disabled)}
          onCheckedChange={(checked) => setStepDisabled(step.id, checked)}
        />
      </FormField>

      {step.kind === "binding" ? <BindingFields step={step} /> : null}
      {step.kind === "mouse" ? <MouseFields step={step} patchConfig={patchConfig} /> : null}
      {step.type === "core.wait" ? <WaitFields step={step} patchConfig={patchConfig} /> : null}
      {step.type === "core.log" ? <LogFields step={step} patchConfig={patchConfig} /> : null}
      {step.type === "keyboard.type" ? <TypeFields step={step} patchConfig={patchConfig} /> : null}
      {step.type === "vision.ocr" ? <OcrFields step={step} patchConfig={patchConfig} /> : null}
      {step.type === "vision.wait" ? <WaitImageFields step={step} patchConfig={patchConfig} /> : null}
      {step.type === "flow.if" ? <IfFields step={step} patchConfig={patchConfig} /> : null}
      {step.type === "flow.loop" ? <LoopFields step={step} patchConfig={patchConfig} /> : null}
    </aside>
  );
}

function BindingFields({ step }: { step: TemplateStep }) {
  const t = useT();
  const patchStep = useEditorStore((s) => s.patchStep);
  return (
    <FormField label={t("edit.field.keys")} htmlFor="step-keys" hint={t("edit.field.keysHint")}>
      <Input
        id="step-keys"
        value={step.keys ?? ""}
        onChange={(event) => {
          const keys = event.target.value;
          patchStep(step.id, { keys, config: { ...step.config, keys } });
        }}
      />
    </FormField>
  );
}

function MouseFields({
  step,
  patchConfig,
}: {
  step: TemplateStep;
  patchConfig: (key: string, value: unknown) => void;
}) {
  const t = useT();
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <FormField label={t("edit.field.x")} htmlFor="step-x">
          <NumberField
            id="step-x"
            value={configNumber(step.config, "x", 0)}
            onValueChange={(value) => patchConfig("x", value ?? 0)}
          />
        </FormField>
        <FormField label={t("edit.field.y")} htmlFor="step-y">
          <NumberField
            id="step-y"
            value={configNumber(step.config, "y", 0)}
            onValueChange={(value) => patchConfig("y", value ?? 0)}
          />
        </FormField>
      </div>
      {step.type !== "mouse.move" ? (
        <FormField label={t("edit.field.button")} htmlFor="step-button">
          <Select
            id="step-button"
            value={configString(step.config, "button", "left")}
            onChange={(event) => patchConfig("button", event.target.value)}
          >
            <option value="left">{t("edit.button.left")}</option>
            <option value="right">{t("edit.button.right")}</option>
            <option value="middle">{t("edit.button.middle")}</option>
          </Select>
        </FormField>
      ) : null}
    </>
  );
}

function WaitFields({
  step,
  patchConfig,
}: {
  step: TemplateStep;
  patchConfig: (key: string, value: unknown) => void;
}) {
  const t = useT();
  return (
    <FormField label={t("edit.field.waitMs")} htmlFor="step-wait" hint={t("edit.field.waitHint")}>
      <NumberField
        id="step-wait"
        min={0}
        value={configNumber(step.config, "ms", 200)}
        onValueChange={(value) => patchConfig("ms", value ?? 0)}
      />
    </FormField>
  );
}

function LogFields({
  step,
  patchConfig,
}: {
  step: TemplateStep;
  patchConfig: (key: string, value: unknown) => void;
}) {
  const t = useT();
  return (
    <FormField label={t("edit.field.message")} htmlFor="step-message">
      <Textarea
        id="step-message"
        rows={3}
        value={configString(step.config, "message", "")}
        onChange={(event) => patchConfig("message", event.target.value)}
      />
    </FormField>
  );
}

function TypeFields({
  step,
  patchConfig,
}: {
  step: TemplateStep;
  patchConfig: (key: string, value: unknown) => void;
}) {
  const t = useT();
  return (
    <FormField label={t("edit.field.text")} htmlFor="step-text" hint={t("edit.field.textHint")}>
      <Textarea
        id="step-text"
        rows={5}
        value={configString(step.config, "text", "")}
        onChange={(event) => patchConfig("text", event.target.value)}
      />
    </FormField>
  );
}

function OcrFields({
  step,
  patchConfig,
}: {
  step: TemplateStep;
  patchConfig: (key: string, value: unknown) => void;
}) {
  const t = useT();
  return (
    <FormField label={t("edit.field.fakeText")} htmlFor="step-ocr" hint={t("edit.field.fakeTextHint")}>
      <Input
        id="step-ocr"
        value={configString(step.config, "fakeText", "确认")}
        onChange={(event) => patchConfig("fakeText", event.target.value)}
      />
    </FormField>
  );
}

function WaitImageFields({
  step,
  patchConfig,
}: {
  step: TemplateStep;
  patchConfig: (key: string, value: unknown) => void;
}) {
  const t = useT();
  return (
    <>
      <FormField label={t("edit.field.waitImageText")} htmlFor="step-wait-image">
        <Input
          id="step-wait-image"
          value={configString(step.config, "text", "")}
          onChange={(event) => patchConfig("text", event.target.value)}
        />
      </FormField>
      <FormField label={t("edit.field.timeoutMs")} htmlFor="step-timeout">
        <NumberField
          id="step-timeout"
          min={1}
          value={configNumber(step.config, "timeoutMs", 8000)}
          onValueChange={(value) => patchConfig("timeoutMs", value ?? 8000)}
        />
      </FormField>
    </>
  );
}

function IfFields({
  step,
  patchConfig,
}: {
  step: TemplateStep;
  patchConfig: (key: string, value: unknown) => void;
}) {
  const t = useT();
  return (
    <>
      <FormField label={t("edit.field.when")} htmlFor="step-when">
        <Select
          id="step-when"
          value={configString(step.config, "when", "ocr.contains")}
          onChange={(event) => patchConfig("when", event.target.value)}
        >
          <option value="ocr.contains">{t("edit.when.contains")}</option>
          <option value="equals">{t("edit.when.equals")}</option>
          <option value="truthy">{t("edit.when.truthy")}</option>
        </Select>
      </FormField>
      <FormField label={t("edit.field.matchText")} htmlFor="step-match-text">
        <Input
          id="step-match-text"
          value={configString(step.config, "text", "")}
          onChange={(event) => patchConfig("text", event.target.value)}
        />
      </FormField>
      <FormField label={t("edit.field.source")} htmlFor="step-source" hint={t("edit.field.sourceHint")}>
        <Input
          id="step-source"
          value={configString(step.config, "source", "{{ocr.text}}")}
          onChange={(event) => patchConfig("source", event.target.value)}
        />
      </FormField>
    </>
  );
}

function LoopFields({
  step,
  patchConfig,
}: {
  step: TemplateStep;
  patchConfig: (key: string, value: unknown) => void;
}) {
  const t = useT();
  return (
    <>
      <FormField label={t("edit.field.loopMax")} htmlFor="step-loop-max">
        <NumberField
          id="step-loop-max"
          min={0}
          value={configNumber(step.config, "max", 3)}
          onValueChange={(value) => patchConfig("max", value ?? 0)}
        />
      </FormField>
      <FormField label={t("edit.field.until")} htmlFor="step-until" hint={t("edit.field.untilHint")}>
        <Input
          id="step-until"
          value={configString(step.config, "until", "")}
          onChange={(event) => patchConfig("until", event.target.value)}
        />
      </FormField>
    </>
  );
}
