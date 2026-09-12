import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { mergeRefs, useDraggable, type DraggableHandleProps } from "./draggable";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** Built-in pointer drag; on by default. */
  draggable?: boolean;
};

const DialogDragContext = React.createContext<{
  handleProps: DraggableHandleProps;
  dragging: boolean;
  enabled: boolean;
} | null>(null);

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, draggable = true, style, ...props }, ref) => {
  const drag = useDraggable({ enabled: draggable });
  const combinedRef = mergeRefs(ref, drag.setNodeRef);

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-fg/20 backdrop-blur-md animate-fade" />
      <DialogDragContext.Provider
        value={{ handleProps: drag.handleProps, dragging: drag.dragging, enabled: draggable }}
      >
        <DialogPrimitive.Content
          ref={combinedRef}
          data-dragging={drag.dragging ? "true" : undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg",
            "glass-modal rounded-2xl p-6 animate-fade",
            "focus:outline-none",
            className,
          )}
          style={{
            ...style,
            transform: `translate(calc(-50% + ${String(drag.offset.x)}px), calc(-50% + ${String(drag.offset.y)}px))`,
          }}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            data-no-drag=""
            className="absolute right-4 top-4 rounded-sm text-fg-faint transition-colors duration-150 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogDragContext.Provider>
    </DialogPrimitive.Portal>
  );
});
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const drag = React.useContext(DialogDragContext);
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-1.5 pr-8",
        drag?.enabled && "cursor-grab select-none",
        drag?.dragging && "cursor-grabbing",
        className,
      )}
      {...(drag?.enabled ? drag.handleProps : {})}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-lg text-fg", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm leading-relaxed text-fg-muted", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-4 flex items-center justify-end gap-2", className)}
      {...props}
    />
  );
}
