// 组件库唯一出口。业务代码只允许 from "@/ui"，见 docs/FRONTEND.md §3.2
export { Button, type ButtonProps } from "./primitives/button";
export { Input } from "./primitives/input";
export { Badge, type BadgeProps } from "./primitives/badge";
export { Separator } from "./primitives/separator";
export { Switch, type SwitchProps } from "./primitives/switch";
export { Select } from "./primitives/select";
export { Tabs } from "./primitives/tabs";
export { Kbd } from "./primitives/kbd";
export { Overlay, type OverlayProps } from "./primitives/overlay";
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
export { SettingRow } from "./composed/setting-row";
export { ChoiceGroup, type ChoiceGroupProps, type ChoiceOption } from "./composed/choice-group";

export { PageHeader } from "./patterns/page-header";
export { EmptyState } from "./patterns/empty-state";
export { ErrorState } from "./patterns/error-state";
export { LoadingState } from "./patterns/loading-state";
export { StatusBadge } from "./patterns/status-badge";
