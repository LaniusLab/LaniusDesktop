import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";
import { temporal } from "zundo";

// M0 演示流程：M2 里程碑将替换为从引擎注册表驱动的完整编辑器
const DEMO_NODES: Node[] = [
  {
    id: "open_app",
    type: "default",
    position: { x: 80, y: 120 },
    data: { label: "window.find · 定位记事本" },
  },
  {
    id: "type_text",
    type: "default",
    position: { x: 380, y: 120 },
    data: { label: "keyboard.type · 输入内容" },
  },
  {
    id: "log_done",
    type: "default",
    position: { x: 680, y: 120 },
    data: { label: "core.log · 记录完成" },
  },
];

const DEMO_EDGES: Edge[] = [
  { id: "e1", source: "open_app", target: "type_text" },
  { id: "e2", source: "type_text", target: "log_done" },
];

interface EditorStore {
  nodes: Node[];
  edges: Edge[];
  dirty: boolean;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  markSaved: () => void;
}

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set) => ({
      nodes: DEMO_NODES,
      edges: DEMO_EDGES,
      dirty: false,
      onNodesChange: (changes) =>
        set((s) => ({ nodes: applyNodeChanges(changes, s.nodes), dirty: true })),
      onEdgesChange: (changes) =>
        set((s) => ({ edges: applyEdgeChanges(changes, s.edges), dirty: true })),
      onConnect: (connection) =>
        set((s) => ({ edges: addEdge(connection, s.edges), dirty: true })),
      markSaved: () => set({ dirty: false }),
    }),
    { limit: 100 },
  ),
);

export function undoEdit() {
  useEditorStore.temporal.getState().undo();
}

export function redoEdit() {
  useEditorStore.temporal.getState().redo();
}
