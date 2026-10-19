import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUiStore } from "@/stores/ui";

import { SettingsDialog } from "./settings-page";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

function renderSettings() {
  useUiStore.setState({ settingsOpen: true });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SettingsDialog />
    </QueryClientProvider>,
  );
}

describe("设置弹窗", () => {
  afterEach(() => {
    useUiStore.setState({ settingsOpen: false });
    navigate.mockClear();
  });

  it("以对话框呈现，不再占用独立页面", () => {
    renderSettings();
    expect(screen.getByRole("dialog", { name: /设置|Settings/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /关闭|Close/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: /切换浅色 \/ 深色|Toggle light \/ dark/i })).not.toBeInTheDocument();
  });

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
    fireEvent.click(screen.getByRole("tab", { name: "常规" }));
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("常规页可列出并撤销信任记录", async () => {
    const { bridge } = await import("@/lib/bridge");
    const hash = "a".repeat(64);
    await bridge.trustMark("settings-demo", hash);
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: "常规" }));
    await waitFor(() => {
      expect(screen.getByText("settings-demo")).toBeInTheDocument();
      expect(screen.getByText(/aaaaaaaaaaaa/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /撤销|Revoke/i }));
    await waitFor(() => {
      expect(screen.getByText(/还没有标记为可信|No trusted flows/i)).toBeInTheDocument();
    });
  });

  it("桌面页可以检查更新并列出 GitHub 版本", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: "桌面" }));
    fireEvent.click(screen.getByRole("button", { name: "检查更新" }));
    await waitFor(() => {
      expect(screen.getByText(/已是最新版本/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "刷新版本列表" }));
    await waitFor(() => {
      expect(screen.getByText("v0.2.0")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "下载" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "下载并安装" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /^下载$/ }));
    await waitFor(() => {
      expect(screen.getByText(/已下载 Lanius|Downloaded Lanius/i)).toBeInTheDocument();
      expect(screen.getByText(/无 SHA256SUMS|No SHA256SUMS/i)).toBeInTheDocument();
    });
  });

  it("凭据页可保存名称且不回显值", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: "凭据" }));
    expect(screen.getByText(/只显示名称|lists names only/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("erp-password"), {
      target: { value: "demo-pass" },
    });
    fireEvent.change(screen.getByPlaceholderText(/写入凭据库|keyring/i), {
      target: { value: "s3cret-value" },
    });
    fireEvent.click(screen.getByRole("button", { name: /保存|Save/ }));
    await waitFor(() => {
      expect(screen.getByText("demo-pass")).toBeInTheDocument();
      expect(screen.getByText("secret://demo-pass")).toBeInTheDocument();
    });
    expect(screen.queryByText("s3cret-value")).not.toBeInTheDocument();
  });

  it("快捷键页可以跳到按键映射", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: "快捷键" }));
    fireEvent.click(screen.getByRole("button", { name: "打开按键映射" }));
    expect(navigate).toHaveBeenCalledWith({ to: "/keymap" });
  });

  it("关于页展示许可与组织", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: "关于" }));
    await waitFor(() => {
      expect(screen.getByText("MIT")).toBeInTheDocument();
      expect(screen.getByText("LaniusLab")).toBeInTheDocument();
    });
  });

  it("调试页可导出本机诊断包", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: "调试" }));
    expect(screen.getByText(/不会自动上传|Nothing is uploaded/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /导出诊断包|Export diagnostics/i }));
    await waitFor(() => {
      expect(screen.getByText(/已导出到|Exported to/i)).toBeInTheDocument();
      expect(screen.getByText(/lanius-diagnostics-mock/)).toBeInTheDocument();
    });
  });
});
