import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsPage } from "./settings-page";

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

describe("设置页", () => {
  it("切换主题会写到根节点", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("radio", { name: "深色" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("切换强调色会写到根节点", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("radio", { name: "蓝色" }));
    expect(document.documentElement.dataset.accent).toBe("ink");
  });

  it("关闭动画会写到根节点", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("radio", { name: "关" }));
    expect(document.documentElement.dataset.motion).toBe("reduce");
  });

  it("切换语言后面板标题跟着变", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("行为页可以检查更新并看到通道未配置", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: "常规" }));
    fireEvent.click(screen.getByRole("button", { name: "检查更新" }));
    await waitFor(() => {
      expect(screen.getByText("更新通道尚未配置")).toBeInTheDocument();
    });
  });

  it("关于页展示许可与组织", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: "关于" }));
    await waitFor(() => {
      expect(screen.getByText("MIT")).toBeInTheDocument();
      expect(screen.getByText("LaniusLab")).toBeInTheDocument();
    });
  });
});
