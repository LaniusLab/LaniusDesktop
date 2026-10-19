import { describe, expect, it } from "vitest";

import { bindingKeysSchema, typeTextSchema, waitMsSchema } from "./step-field-schema";

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
});
