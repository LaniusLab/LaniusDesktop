// 组件库唯一出口。业务代码只允许 from "@/ui"，见 docs/FRONTEND.md §3.2
export { Button, type ButtonProps } from "./primitives/button";
export { Input } from "./primitives/input";
export { Label } from "./primitives/label";
export { Textarea } from "./primitives/textarea";
export { Checkbox, type CheckboxProps } from "./primitives/checkbox";
export { Radio, RadioGroup, type RadioProps, type RadioGroupProps } from "./primitives/radio";
export { Badge, type BadgeProps } from "./primitives/badge";
export { Separator } from "./primitives/separator";
export { Switch, type SwitchProps } from "./primitives/switch";
export { Select } from "./primitives/select";
export { Tabs } from "./primitives/tabs";
export { Kbd, type KbdProps } from "./primitives/kbd";
export { Overlay, type OverlayProps } from "./primitives/overlay";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./primitives/card";
export { Skeleton } from "./primitives/skeleton";
export { Spinner, type SpinnerProps } from "./primitives/spinner";
export { Progress, type ProgressProps } from "./primitives/progress";
export { Avatar, type AvatarProps } from "./primitives/avatar";
export { Alert, type AlertProps, type AlertTone } from "./primitives/alert";
export { Slider, type SliderProps } from "./primitives/slider";
export { ScrollArea } from "./primitives/scroll-area";
export {
  Draggable,
  DraggableHandle,
  useDraggable,
  useDraggableContext,
  type DraggableProps,
  type UseDraggableOptions,
  type UseDraggableResult,
} from "./primitives/draggable";
export {
  SplitPane,
  type SplitPaneProps,
  type SplitOrientation,
  type SplitPrimary,
} from "./primitives/split-pane";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./primitives/dialog";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./primitives/tooltip";
export { Toggle, ToggleGroup, type ToggleProps, type ToggleGroupProps } from "./primitives/toggle";
export { Chip, type ChipProps } from "./primitives/chip";
export { Collapsible, type CollapsibleProps } from "./primitives/collapsible";
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./primitives/table";
export { Breadcrumb, type BreadcrumbItem, type BreadcrumbProps } from "./primitives/breadcrumb";
export { Stepper, type StepperStep, type StepperProps } from "./primitives/stepper";
export {
  Toast,
  ToastStack,
  type ToastProps,
  type ToastTone,
  type ToastItem,
  type ToastStackProps,
} from "./primitives/toast";
export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  type MenuProps,
} from "./primitives/menu";
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  type ContextMenuProps,
} from "./primitives/context-menu";
export { Pagination, paginationItems, type PaginationProps } from "./primitives/pagination";

export { FormField } from "./composed/form-field";
export { SettingRow } from "./composed/setting-row";
export { ChoiceGroup, type ChoiceGroupProps, type ChoiceOption } from "./composed/choice-group";
export { SearchField, type SearchFieldProps } from "./composed/search-field";
export { CopyButton, type CopyButtonProps } from "./composed/copy-button";
export { NumberField, type NumberFieldProps } from "./composed/number-field";
export { FileField, type FileFieldProps } from "./composed/file-field";
export { KeyRecorder, type KeyRecorderProps } from "./composed/key-recorder";

export { PageHeader } from "./patterns/page-header";
export { EmptyState } from "./patterns/empty-state";
export { ErrorState } from "./patterns/error-state";
export { LoadingState } from "./patterns/loading-state";
export { StatusBadge } from "./patterns/status-badge";
