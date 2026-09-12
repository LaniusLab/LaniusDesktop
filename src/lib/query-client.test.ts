import { describe, expect, it } from "vitest";

import { queryClient } from "./query-client";

describe("queryClient", () => {
  it("导出单例", () => {
    expect(queryClient).toBeTruthy();
    expect(typeof queryClient.fetchQuery).toBe("function");
  });
});
