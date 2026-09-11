import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 引擎数据的真源在引擎侧；event 驱动失效，不做轮询
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5_000,
    },
  },
});
