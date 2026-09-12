import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormField } from "./form-field";

describe("FormField", () => {
  it("优先显示 error，其次 hint", () => {
    const { rerender } = render(
      <FormField label="名称" hint="提示">
        <input />
      </FormField>,
    );
    expect(screen.getByText("提示")).toBeInTheDocument();
    rerender(
      <FormField label="名称" hint="提示" error="错误">
        <input />
      </FormField>,
    );
    expect(screen.getByText("错误")).toBeInTheDocument();
    expect(screen.queryByText("提示")).not.toBeInTheDocument();
  });
});
