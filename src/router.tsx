import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { GalleryPage } from "@/modules/dev/gallery-page";
import { FlowsPage } from "@/modules/flow-editor/flows-page";
import { HistoryPage } from "@/modules/history/history-page";
import { AppLayout } from "@/modules/layout/app-layout";
import { SettingsPage } from "@/modules/settings/settings-page";
import { StartPage } from "@/modules/start/start-page";

const rootRoute = createRootRoute({ component: AppLayout });

const startRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: StartPage,
});

const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/edit",
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

// 组件页（ADR-0006）；旧路径 /dev/gallery 保留以免书签失效
const galleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gallery",
  component: GalleryPage,
});

const galleryLegacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dev/gallery",
  component: GalleryPage,
});

const routeTree = rootRoute.addChildren([
  startRoute,
  editRoute,
  historyRoute,
  settingsRoute,
  galleryRoute,
  galleryLegacyRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
