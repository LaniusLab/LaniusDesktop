import { describe, expect, it } from "vitest";

import {
  bindingKeysSchema,
  ifFieldsSchema,
  logMessageSchema,
  loopFieldsSchema,
  mouseFieldsSchema,
  stepLabelSchema,
  typeTextSchema,
  waitImageSchema,
  waitMsSchema,
} from "./step-field-schema";

describe("step-field-schema", () => {
  it("binding keys 必填", () => {
    expect(bindingKeysSchema.safeParse({ keys: "" }).success).toBe(false);
    expect(bindingKeysSchema.safeParse({ keys: "Enter" }).success).toBe(true);
  });

  it("wait ms 不能为负", () => {
    expect(waitMsSchema.safeParse({ ms: -1 }).success).toBe(false);
    expect(waitMsSchema.safeParse({ ms: 0 }).success).toBe(true);
  });

  it("type text 必填", () => {
    expect(typeTextSchema.safeParse({ text: "  " }).success).toBe(false);
    expect(typeTextSchema.safeParse({ text: "hi" }).success).toBe(true);
  });

  it("label / log / mouse / waitImage / if / loop", () => {
    expect(stepLabelSchema.safeParse({ label: "" }).success).toBe(false);
    expect(logMessageSchema.safeParse({ message: "" }).success).toBe(false);
    expect(mouseFieldsSchema.safeParse({ x: 1, y: 2, button: "left" }).success).toBe(true);
    expect(waitImageSchema.safeParse({ text: "", timeoutMs: 0 }).success).toBe(false);
    expect(
      ifFieldsSchema.safeParse({ when: "equals", text: "a", source: "{{x}}" }).success,
    ).toBe(true);
    expect(loopFieldsSchema.safeParse({ max: -1, until: "" }).success).toBe(false);
  });
});
