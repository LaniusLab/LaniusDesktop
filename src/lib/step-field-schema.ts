import { z } from "zod";

/** 属性表 Zod；错误 key 进 i18n。必填项与引擎 `flow.validate` 对齐。 */

export const bindingKeysSchema = z.object({
  keys: z.string().trim().min(1, "edit.issue.keys"),
});

export const waitMsSchema = z.object({
  ms: z.number().finite().min(0, "edit.issue.wait"),
});

export const typeTextSchema = z.object({
  text: z.string().trim().min(1, "edit.issue.text"),
});

export const stepLabelSchema = z.object({
  label: z.string().trim().min(1, "edit.issue.label"),
});

export const mouseFieldsSchema = z.object({
  x: z.number({ invalid_type_error: "edit.issue.coord" }).finite({ message: "edit.issue.coord" }),
  y: z.number({ invalid_type_error: "edit.issue.coord" }).finite({ message: "edit.issue.coord" }),
  button: z.enum(["left", "right", "middle"]),
});

export const logMessageSchema = z.object({
  message: z.string().trim().min(1, "edit.issue.message"),
});

export const ocrFakeTextSchema = z.object({
  fakeText: z.string().trim().min(1, "edit.issue.ocrText"),
});

export const waitImageSchema = z.object({
  text: z.string().trim().min(1, "edit.issue.waitImage"),
  timeoutMs: z
    .number({ invalid_type_error: "edit.issue.timeout" })
    .finite({ message: "edit.issue.timeout" })
    .min(1, "edit.issue.timeout"),
});

export const ifFieldsSchema = z.object({
  when: z.enum(["ocr.contains", "equals", "truthy"]),
  text: z.string(),
  source: z.string().trim().min(1, "edit.issue.source"),
});

export const loopFieldsSchema = z.object({
  max: z
    .number({ invalid_type_error: "edit.issue.loopMax" })
    .finite({ message: "edit.issue.loopMax" })
    .min(0, "edit.issue.loopMax"),
  until: z.string(),
});
