import { z } from "zod";

/** 属性表必填字段；文案与引擎 `flow.validate` / i18n `edit.issue.*` 对齐。 */
export const bindingKeysSchema = z.object({
  keys: z.string().trim().min(1, "edit.issue.keys"),
});

export const waitMsSchema = z.object({
  ms: z.number().finite().min(0, "edit.issue.wait"),
});

export const typeTextSchema = z.object({
  text: z.string().trim().min(1, "edit.issue.text"),
});
