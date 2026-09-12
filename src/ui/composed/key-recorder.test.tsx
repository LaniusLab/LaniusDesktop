import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KeyRecorder } from "./key-recorder";

describe("KeyRecorder", () => {
  it("录制方向键", () => {
    const onChange = vi.fn();
    render(<KeyRecorder value="" onChange={onChange} recordingLabel="录" emptyLabel="录制" />);
    fireEvent.click(screen.getByRole("button", { name: "录制" }));
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith("Left");
  });
});
