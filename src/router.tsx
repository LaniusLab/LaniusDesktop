import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";

import { GalleryPage } from "@/modules/dev/gallery-page";
import { FlowsPage } from "@/modules/flow-editor/flows-page";
import { HistoryPage } from "@/modules/history/history-page";
import { KeymapPage } from "@/modules/keymap/keymap-page";
import { AppLayout } from "@/modules/layout/app-layout";
import { StartPage } from "@/modules/start/start-page";
import { useUiStore } from "@/stores/ui";

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

const keymapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/keymap",
  component: KeymapPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  beforeLoad: () => {
    useUiStore.getState().setSettingsOpen(true);
    throw redirect({ to: "/" });
  },
});

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
  keymapRoute,
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
