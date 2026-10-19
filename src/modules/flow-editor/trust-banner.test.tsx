import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockBridge } from "@/lib/bridge/mock";
import { createDemoSteps } from "@/lib/template";
import { PROCESS_CATALOG } from "@/lib/targets";
import { useEditorStore } from "@/stores/editor";

import { TrustBanner } from "./trust-banner";

const mockBridge = createMockBridge();

vi.mock("@/lib/bridge", () => ({
  get bridge() {
    return mockBridge;
  },
}));

function renderBanner() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TrustBanner />
    </QueryClientProvider>,
  );
}

describe("TrustBanner", () => {
  beforeEach(() => {
    const first = PROCESS_CATALOG[0];
    useEditorStore.setState({
      steps: createDemoSteps(),
      processId: first?.id ?? "notepad",
      match: first?.match,
      locate: first?.recommended,
      flowId: "demo-flow",
      dirty: false,
    });
  });

  afterEach(async () => {
    await mockBridge.trustRevoke("demo-flow");
    vi.clearAllMocks();
  });

  it("未信任时展示横幅，标记后消失", async () => {
    renderBanner();
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /标记为可信|Mark as trusted/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /标记为可信|Mark as trusted/i }));
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("关闭后本会话不再显示", async () => {
    renderBanner();
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /知道了|Dismiss/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
