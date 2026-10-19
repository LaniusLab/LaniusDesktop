import { create } from "zustand";

import type { FlowValidationIssue } from "@/lib/bridge";

interface ValidationStore {
  ok: boolean;
  issues: FlowValidationIssue[];
  setResult: (ok: boolean, issues: FlowValidationIssue[]) => void;
  clear: () => void;
  issuesFor: (nodeId: string) => FlowValidationIssue[];
}

export const useValidationStore = create<ValidationStore>((set, get) => ({
  ok: true,
  issues: [],
  setResult: (ok, issues) => set({ ok, issues }),
  clear: () => set({ ok: true, issues: [] }),
  issuesFor: (nodeId) => get().issues.filter((issue) => issue.nodeId === nodeId),
}));
