import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { GalleryPage } from "@/modules/dev/gallery-page";
import { FlowsPage } from "@/modules/flow-editor/flows-page";
import { HistoryPage } from "@/modules/history/history-page";
import { AppLayout } from "@/modules/layout/app-layout";
import { SettingsPage } from "@/modules/settings/settings-page";

const rootRoute = createRootRoute({ component: AppLayout });

const flowsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: FlowsPage,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

// 组件库活文档（ADR-0006）；M2 起改为按 import.meta.env.DEV 懒加载以排除生产包
const galleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dev/gallery",
  component: GalleryPage,
});

const routeTree = rootRoute.addChildren([flowsRoute, historyRoute, settingsRoute, galleryRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
