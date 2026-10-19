import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  bindingKeysSchema,
  ifFieldsSchema,
  logMessageSchema,
  loopFieldsSchema,
  mouseFieldsSchema,
  ocrFakeTextSchema,
  stepLabelSchema,
  typeTextSchema,
  waitImageSchema,
  waitMsSchema,
} from "@/lib/step-field-schema";
import {
  configNumber,
  configString,
  findStepById,
  stepIssueKey,
  type TemplateStep,
} from "@/lib/template";
import { useEditorStore } from "@/stores/editor";
import { useValidationStore } from "@/stores/validation";
import { useT } from "@/stores/ui";
import { EmptyState, FormField, Input, NumberField, Select, Switch, Textarea } from "@/ui";

/** 步骤属性：字段统一 Zod+RHF；引擎 issue 同步展示。 */
export function TemplateInspector() {
  const t = useT();
  const steps = useEditorStore((s) => s.steps);
  const selectedStepId = useEditorStore((s) => s.selectedStepId);
  const patchStep = useEditorStore((s) => s.patchStep);
  const setStepDisabled = useEditorStore((s) => s.setStepDisabled);
  const allIssues = useValidationStore((s) => s.issues);
  const engineIssues = selectedStepId
    ? allIssues.filter((issue) => issue.nodeId === selectedStepId)
    : [];
  const step = selectedStepId ? findStepById(steps, selectedStepId) : undefined;

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <EmptyState title={t("edit.inspector.empty")} description={t("edit.inspector.emptyHint")} />
      </div>
    );
  }

  const localIssue = stepIssueKey(step);
  const headline = engineIssues[0]?.message ?? (localIssue ? t(localIssue) : null);
  const patchConfig = (key: string, value: unknown) => {
    patchStep(step.id, { config: { ...step.config, [key]: value } });
  };

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-auto bg-glass px-3 py-4 backdrop-blur-md">
      <p className="px-1 font-display text-sm text-fg">{t("edit.inspector")}</p>
      {headline ? <p className="px-1 text-xs text-danger">{headline}</p> : null}

      <LabelField step={step} />

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

function LabelField({ step }: { step: TemplateStep }) {
  const t = useT();
  const patchStep = useEditorStore((s) => s.patchStep);
  const form = useForm({
    resolver: zodResolver(stepLabelSchema),
    values: { label: step.label },
    mode: "onChange",
  });
  const errorKey = form.formState.errors.label?.message;
  return (
    <FormField
      label={t("edit.field.label")}
      htmlFor="step-label"
      error={errorKey ? t(errorKey) : undefined}
    >
      <Input
        id="step-label"
        value={form.watch("label")}
        onChange={(event) => {
          const label = event.target.value;
          void form.setValue("label", label, { shouldValidate: true });
          patchStep(step.id, { label });
        }}
      />
    </FormField>
  );
}

function BindingFields({ step }: { step: TemplateStep }) {
  const t = useT();
  const patchStep = useEditorStore((s) => s.patchStep);
  const form = useForm({
    resolver: zodResolver(bindingKeysSchema),
    values: { keys: step.keys ?? "" },
    mode: "onChange",
  });
  const errorKey = form.formState.errors.keys?.message;
  return (
    <FormField
      label={t("edit.field.keys")}
      htmlFor="step-keys"
      hint={t("edit.field.keysHint")}
      error={errorKey ? t(errorKey) : undefined}
    >
      <Input
        id="step-keys"
        value={form.watch("keys")}
        onChange={(event) => {
          const keys = event.target.value;
          void form.setValue("keys", keys, { shouldValidate: true });
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
  const form = useForm({
    resolver: zodResolver(mouseFieldsSchema),
    values: {
      x: configNumber(step.config, "x", 0),
      y: configNumber(step.config, "y", 0),
      button: (configString(step.config, "button", "left") || "left") as
        | "left"
        | "right"
        | "middle",
    },
    mode: "onChange",
  });
  const xErr = form.formState.errors.x?.message;
  const yErr = form.formState.errors.y?.message;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <FormField label={t("edit.field.x")} htmlFor="step-x" error={xErr ? t(xErr) : undefined}>
          <NumberField
            id="step-x"
            value={form.watch("x")}
            onValueChange={(value) => {
              const x = value ?? 0;
              void form.setValue("x", x, { shouldValidate: true });
              patchConfig("x", x);
            }}
          />
        </FormField>
        <FormField label={t("edit.field.y")} htmlFor="step-y" error={yErr ? t(yErr) : undefined}>
          <NumberField
            id="step-y"
            value={form.watch("y")}
            onValueChange={(value) => {
              const y = value ?? 0;
              void form.setValue("y", y, { shouldValidate: true });
              patchConfig("y", y);
            }}
          />
        </FormField>
      </div>
      {step.type !== "mouse.move" ? (
        <FormField label={t("edit.field.button")} htmlFor="step-button">
          <Select
            id="step-button"
            value={form.watch("button")}
            onChange={(event) => {
              const button = event.target.value as "left" | "right" | "middle";
              void form.setValue("button", button, { shouldValidate: true });
              patchConfig("button", button);
            }}
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
  const form = useForm({
    resolver: zodResolver(waitMsSchema),
    values: { ms: configNumber(step.config, "ms", 200) },
    mode: "onChange",
  });
  const errorKey = form.formState.errors.ms?.message;
  return (
    <FormField
      label={t("edit.field.waitMs")}
      htmlFor="step-wait"
      hint={t("edit.field.waitHint")}
      error={errorKey ? t(errorKey) : undefined}
    >
      <NumberField
        id="step-wait"
        min={0}
        value={form.watch("ms")}
        onValueChange={(value) => {
          const ms = value ?? 0;
          void form.setValue("ms", ms, { shouldValidate: true });
          patchConfig("ms", ms);
        }}
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
  const form = useForm({
    resolver: zodResolver(logMessageSchema),
    values: { message: configString(step.config, "message", "") },
    mode: "onChange",
  });
  const errorKey = form.formState.errors.message?.message;
  return (
    <FormField
      label={t("edit.field.message")}
      htmlFor="step-message"
      error={errorKey ? t(errorKey) : undefined}
    >
      <Textarea
        id="step-message"
        rows={3}
        value={form.watch("message")}
        onChange={(event) => {
          const message = event.target.value;
          void form.setValue("message", message, { shouldValidate: true });
          patchConfig("message", message);
        }}
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
  const form = useForm({
    resolver: zodResolver(typeTextSchema),
    values: { text: configString(step.config, "text", "") },
    mode: "onChange",
  });
  const errorKey = form.formState.errors.text?.message;
  return (
    <FormField
      label={t("edit.field.text")}
      htmlFor="step-text"
      hint={t("edit.field.textHint")}
      error={errorKey ? t(errorKey) : undefined}
    >
      <Textarea
        id="step-text"
        rows={5}
        value={form.watch("text")}
        onChange={(event) => {
          const text = event.target.value;
          void form.setValue("text", text, { shouldValidate: true });
          patchConfig("text", text);
        }}
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
  const form = useForm({
    resolver: zodResolver(ocrFakeTextSchema),
    values: { fakeText: configString(step.config, "fakeText", "确认") },
    mode: "onChange",
  });
  const errorKey = form.formState.errors.fakeText?.message;
  return (
    <FormField
      label={t("edit.field.fakeText")}
      htmlFor="step-ocr"
      hint={t("edit.field.fakeTextHint")}
      error={errorKey ? t(errorKey) : undefined}
    >
      <Input
        id="step-ocr"
        value={form.watch("fakeText")}
        onChange={(event) => {
          const fakeText = event.target.value;
          void form.setValue("fakeText", fakeText, { shouldValidate: true });
          patchConfig("fakeText", fakeText);
        }}
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
  const form = useForm({
    resolver: zodResolver(waitImageSchema),
    values: {
      text: configString(step.config, "text", ""),
      timeoutMs: configNumber(step.config, "timeoutMs", 8000),
    },
    mode: "onChange",
  });
  const textErr = form.formState.errors.text?.message;
  const timeoutErr = form.formState.errors.timeoutMs?.message;
  return (
    <>
      <FormField
        label={t("edit.field.waitImageText")}
        htmlFor="step-wait-image"
        error={textErr ? t(textErr) : undefined}
      >
        <Input
          id="step-wait-image"
          value={form.watch("text")}
          onChange={(event) => {
            const text = event.target.value;
            void form.setValue("text", text, { shouldValidate: true });
            patchConfig("text", text);
          }}
        />
      </FormField>
      <FormField
        label={t("edit.field.timeoutMs")}
        htmlFor="step-timeout"
        error={timeoutErr ? t(timeoutErr) : undefined}
      >
        <NumberField
          id="step-timeout"
          min={1}
          value={form.watch("timeoutMs")}
          onValueChange={(value) => {
            const timeoutMs = value ?? 8000;
            void form.setValue("timeoutMs", timeoutMs, { shouldValidate: true });
            patchConfig("timeoutMs", timeoutMs);
          }}
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
  const form = useForm({
    resolver: zodResolver(ifFieldsSchema),
    values: {
      when: (configString(step.config, "when", "ocr.contains") || "ocr.contains") as
        | "ocr.contains"
        | "equals"
        | "truthy",
      text: configString(step.config, "text", ""),
      source: configString(step.config, "source", "{{ocr.text}}"),
    },
    mode: "onChange",
  });
  const sourceErr = form.formState.errors.source?.message;
  return (
    <>
      <FormField label={t("edit.field.when")} htmlFor="step-when">
        <Select
          id="step-when"
          value={form.watch("when")}
          onChange={(event) => {
            const when = event.target.value as "ocr.contains" | "equals" | "truthy";
            void form.setValue("when", when, { shouldValidate: true });
            patchConfig("when", when);
          }}
        >
          <option value="ocr.contains">{t("edit.when.contains")}</option>
          <option value="equals">{t("edit.when.equals")}</option>
          <option value="truthy">{t("edit.when.truthy")}</option>
        </Select>
      </FormField>
      <FormField label={t("edit.field.matchText")} htmlFor="step-match-text">
        <Input
          id="step-match-text"
          value={form.watch("text")}
          onChange={(event) => {
            const text = event.target.value;
            void form.setValue("text", text, { shouldValidate: true });
            patchConfig("text", text);
          }}
        />
      </FormField>
      <FormField
        label={t("edit.field.source")}
        htmlFor="step-source"
        hint={t("edit.field.sourceHint")}
        error={sourceErr ? t(sourceErr) : undefined}
      >
        <Input
          id="step-source"
          value={form.watch("source")}
          onChange={(event) => {
            const source = event.target.value;
            void form.setValue("source", source, { shouldValidate: true });
            patchConfig("source", source);
          }}
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
  const form = useForm({
    resolver: zodResolver(loopFieldsSchema),
    values: {
      max: configNumber(step.config, "max", 3),
      until: configString(step.config, "until", ""),
    },
    mode: "onChange",
  });
  const maxErr = form.formState.errors.max?.message;
  return (
    <>
      <FormField
        label={t("edit.field.loopMax")}
        htmlFor="step-loop-max"
        error={maxErr ? t(maxErr) : undefined}
      >
        <NumberField
          id="step-loop-max"
          min={0}
          value={form.watch("max")}
          onValueChange={(value) => {
            const max = value ?? 0;
            void form.setValue("max", max, { shouldValidate: true });
            patchConfig("max", max);
          }}
        />
      </FormField>
      <FormField label={t("edit.field.until")} htmlFor="step-until" hint={t("edit.field.untilHint")}>
        <Input
          id="step-until"
          value={form.watch("until")}
          onChange={(event) => {
            const until = event.target.value;
            void form.setValue("until", until, { shouldValidate: true });
            patchConfig("until", until);
          }}
        />
      </FormField>
    </>
  );
}
