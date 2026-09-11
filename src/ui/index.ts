// 组件库唯一出口。业务代码只允许 from "@/ui"，见 docs/FRONTEND.md §3.2
export { Button, type ButtonProps } from "./primitives/button";
export { Input } from "./primitives/input";
export { Badge, type BadgeProps } from "./primitives/badge";
export { Separator } from "./primitives/separator";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./primitives/dialog";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./primitives/tooltip";

export { FormField } from "./composed/form-field";

export { PageHeader } from "./patterns/page-header";
export { EmptyState } from "./patterns/empty-state";
export { ErrorState } from "./patterns/error-state";
export { StatusBadge } from "./patterns/status-badge";
