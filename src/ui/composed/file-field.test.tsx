import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FileField } from "./file-field";

describe("FileField", () => {
  it("选择文件后展示名称，可清除", () => {
    const onFilesChange = vi.fn();
    const file = new File(["hi"], "note.txt", { type: "text/plain" });
    const { rerender } = render(<FileField files={[]} onFilesChange={onFilesChange} />);
    fireEvent.change(screen.getByLabelText("选择文件"), { target: { files: [file] } });
    expect(onFilesChange).toHaveBeenCalledWith([file]);

    rerender(<FileField files={[file]} onFilesChange={onFilesChange} />);
    expect(screen.getByText("note.txt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "清除" }));
    expect(onFilesChange).toHaveBeenCalledWith([]);
  });

  it("拖放写入文件", () => {
    const onFilesChange = vi.fn();
    const file = new File(["img"], "shot.png", { type: "image/png" });
    render(<FileField files={[]} onFilesChange={onFilesChange} accept="image/*" />);
    fireEvent.drop(screen.getByRole("group", { name: "文件选择" }), {
      dataTransfer: { files: [file] },
    });
    expect(onFilesChange).toHaveBeenCalledWith([file]);
  });
});
