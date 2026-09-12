import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { PageHeader } from "./page-header";

describe("UI patterns", () => {
  it("Empty / Error / Loading / PageHeader", () => {
    const onRetry = vi.fn();
    render(
      <>
        <EmptyState title="空" description="没有内容" />
        <ErrorState title="失败" description="boom" traceId="t1" onRetry={onRetry} />
        <LoadingState />
        <PageHeader title="标题" description="说明" actions={<button type="button">动作</button>} />
      </>,
    );
    expect(screen.getByText("空")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /重试|Retry|再试/i }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText("标题")).toBeInTheDocument();
  });
});
