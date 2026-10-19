import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARROWS_PROFILE_ID, createDefaultKeymapState } from "@/lib/keymap";
import { createDemoSteps } from "@/lib/template";
import { PROCESS_CATALOG } from "@/lib/targets";
import { useEditorStore } from "@/stores/editor";
import { useKeymapStore } from "@/stores/keymap";
import { TooltipProvider } from "@/ui";

import { FlowsPage } from "./flows-page";

vi.mock("@/lib/commands/registry", () => ({
  registry: {
    run: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("@/lib/commands/context", () => ({
  currentContext: () => ({
    bridge: { flowRun: vi.fn() },
    engine: { status: "ready" },
    execution: { phase: "idle" },
    editor: { dirty: false },
    navigate: vi.fn(),
    ui: { toggleTheme: vi.fn(), setSearchOpen: vi.fn(), setSettingsOpen: vi.fn() },
  }),
}));

describe("模板页", () => {
  afterEach(() => {
    const first = PROCESS_CATALOG[0];
    useEditorStore.setState({
      steps: createDemoSteps(),
      keymapProfileId: "default",
      processId: first?.id ?? "notepad",
      match: first?.match,
      locate: first?.recommended,
      selectedStepId: createDemoSteps()[0]?.id,
      dirty: false,
      filePath: undefined,
      flowId: "session-template",
      flowName: "当前模板",
    });
    useKeymapStore.setState(createDefaultKeymapState());
  });

  it("渲染有序步骤，点选积木写入模板，并可试一次", async () => {
    const { registry } = await import("@/lib/commands/registry");
    render(
      <TooltipProvider>
        <FlowsPage />
      </TooltipProvider>,
    );
    expect(screen.getByText("稍等片刻")).toBeInTheDocument();
    expect(screen.getByText("输入多行文本")).toBeInTheDocument();
    expect(screen.getAllByText("回车").length).toBeGreaterThan(0);
    const before = useEditorStore.getState().steps.length;
    fireEvent.click(screen.getByRole("button", { name: "记一条日志" }));
    expect(useEditorStore.getState().steps.length).toBe(before + 1);
    fireEvent.click(screen.getByRole("button", { name: /试一次|Try once/i }));
    expect(registry.run).toHaveBeenCalledWith("flow.run", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: /预演|Preview/i }));
    expect(registry.run).toHaveBeenCalledWith("flow.dryRun", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "保存模板" }));
    expect(registry.run).toHaveBeenCalledWith("flow.save", expect.anything());
    fireEvent.click(screen.getAllByRole("button", { name: "撤销" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "重做" })[0]);
  });

  it("点选步骤后可改等待时间", () => {
    render(
      <TooltipProvider>
        <FlowsPage />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getAllByText("稍等片刻")[0]);
    const wait = screen.getByLabelText(/等待（毫秒）|Wait \(ms\)/);
    fireEvent.change(wait, { target: { value: "1500" } });
    expect(useEditorStore.getState().steps[0]?.config.ms).toBe(1500);
    expect(useEditorStore.getState().dirty).toBe(true);
  });

  it("按键分组可切换方案并列出映射表", () => {
    useKeymapStore.setState({
      ...createDefaultKeymapState(),
      activeId: ARROWS_PROFILE_ID,
      selectedId: ARROWS_PROFILE_ID,
    });
    useEditorStore.setState({ keymapProfileId: ARROWS_PROFILE_ID });
    render(
      <TooltipProvider>
        <FlowsPage />
      </TooltipProvider>,
    );
    expect(screen.getByLabelText("按键方案")).toBeInTheDocument();
    expect(screen.getByText("向上")).toBeInTheDocument();
    expect(screen.getByText("Up")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("按键方案"), { target: { value: "default" } });
    expect(screen.getByLabelText("按键方案")).toHaveValue("default");
    expect(screen.getAllByText("回车").length).toBeGreaterThan(0);
  });

  it("可切换目标进程并看到推荐通道", () => {
    render(
      <TooltipProvider>
        <FlowsPage />
      </TooltipProvider>,
    );
    fireEvent.change(screen.getByLabelText("目标进程"), { target: { value: "client" } });
    expect(useEditorStore.getState().locate.channel).toBe("vision");
    expect(screen.getByText("画面")).toBeInTheDocument();
  });

  it("可把鼠标积木拖进步骤末尾", () => {
    render(
      <TooltipProvider>
        <FlowsPage />
      </TooltipProvider>,
    );
    const transfer = createTransfer();
    const before = useEditorStore.getState().steps.map((step) => step.label);
    fireEvent.dragStart(screen.getByRole("button", { name: "单击" }), { dataTransfer: transfer });
    fireEvent.drop(screen.getByText("拖到这里追加到末尾"), { dataTransfer: transfer });
    expect(useEditorStore.getState().steps.map((step) => step.label)).toEqual([...before, "单击"]);
  });

  it("可在列表内拖动重排步骤", () => {
    render(
      <TooltipProvider>
        <FlowsPage />
      </TooltipProvider>,
    );
    const transfer = createTransfer();
    const first = screen.getByText("稍等片刻").closest("[draggable='true']");
    if (!(first instanceof HTMLElement)) {
      throw new Error("步骤行应可拖拽");
    }
    fireEvent.dragStart(first, { dataTransfer: transfer });
    fireEvent.drop(screen.getByText("拖到这里追加到末尾"), { dataTransfer: transfer });
    expect(useEditorStore.getState().steps.map((step) => step.label)).toEqual([
      "输入多行文本",
      "记下完成",
      "稍等片刻",
    ]);
  });

  it("可切换到导图预览", () => {
    render(
      <TooltipProvider>
        <FlowsPage />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "导图预览" }));
    expect(screen.getByRole("img", { name: "模板导图" })).toBeInTheDocument();
  });
});

function createTransfer(): DataTransfer {
  const store = new Map<string, string>();
  return {
    dropEffect: "move",
    effectAllowed: "all",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    setData(type: string, value: string) {
      store.set(type, value);
    },
    getData(type: string) {
      return store.get(type) ?? "";
    },
    clearData() {
      store.clear();
    },
    setDragImage() {},
  } as DataTransfer;
}
