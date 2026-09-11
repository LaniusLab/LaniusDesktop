import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { registerBuiltinCommands } from "@/lib/commands/builtins";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";
import { TooltipProvider } from "@/ui";

import "@/ui/tokens.css";

registerBuiltinCommands();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
