import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createDefaultKeymapState } from "@/lib/keymap";
import { useKeymapStore } from "@/stores/keymap";

import { KeymapPage } from "./keymap-page";

describe("按键映射页", () => {
  it("切换方案、设为编排默认并添加条目", () => {
    useKeymapStore.setState(createDefaultKeymapState());
    render(<KeymapPage />);
    expect(screen.getByRole("heading", { name: /按键映射|Keymap/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("回车")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "添加条目" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /方向键/ }));
    expect(screen.getByDisplayValue("向上")).toBeInTheDocument();
    expect(screen.getAllByText("Up").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "设为编排默认" }));
    expect(useKeymapStore.getState().activeId).toBe("arrows");

    fireEvent.click(screen.getByRole("button", { name: "新建方案" }));
    expect(screen.getByDisplayValue("方案 1")).toBeInTheDocument();
    expect(screen.getByText("这套还没有条目")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "添加条目" }));
    expect(useKeymapStore.getState().profiles.some((profile) => profile.mappings.some((mapping) => mapping.keys === ""))).toBe(
      true,
    );
  });

  it("复制后删除需确认，取消不删，确认才删", () => {
    useKeymapStore.setState(createDefaultKeymapState());
    render(<KeymapPage />);
    fireEvent.click(screen.getByRole("button", { name: "复制" }));
    expect(screen.getByDisplayValue("默认 副本")).toBeInTheDocument();
    expect(useKeymapStore.getState().profiles).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /删除「默认 副本」/ })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "取消" }));
    expect(useKeymapStore.getState().profiles).toHaveLength(3);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "删除" }));
    expect(useKeymapStore.getState().profiles).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /默认/ }));
    expect(useKeymapStore.getState().removeProfile("default")).toEqual({ ok: false, code: "locked" });
    expect(useKeymapStore.getState().renameProfile("default", "Nope")).toEqual({ ok: false, code: "locked" });
    expect(useKeymapStore.getState().addMapping("default")).toBeNull();
    expect(useKeymapStore.getState().profiles.some((profile) => profile.id === "default")).toBe(true);
    expect(useKeymapStore.getState().profiles.find((profile) => profile.id === "default")?.name).toBe("Default");
  });
});
