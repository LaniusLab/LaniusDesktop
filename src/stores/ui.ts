import { create } from "zustand";

type Theme = "dark" | "light";

interface UiState {
  theme: Theme;
  paletteOpen: boolean;
  toggleTheme: () => void;
  setPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  theme: "dark",
  paletteOpen: false,
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === "dark" ? "light" : "dark";
      // data-theme 是 tokens.css 的亮色开关，见 src/ui/tokens.css
      document.documentElement.dataset.theme = theme === "light" ? "light" : "";
      return { theme };
    }),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
}));
