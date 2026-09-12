import { Primitive } from "@radix-ui/react-primitive";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type PaginationItem = number | "ellipsis";

export function paginationItems(
  page: number,
  pageCount: number,
  siblingCount = 1,
): PaginationItem[] {
  if (pageCount <= 0) return [];
  if (pageCount === 1) return [1];

  const current = Math.min(Math.max(page, 1), pageCount);
  const siblings = Math.max(0, siblingCount);
  const windowSize = siblings * 2 + 1;
  if (pageCount <= windowSize + 4) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const left = Math.max(2, current - siblings);
  const right = Math.min(pageCount - 1, current + siblings);
  const items: PaginationItem[] = [1];
  if (left > 2) items.push("ellipsis");
  for (let cursor = left; cursor <= right; cursor += 1) items.push(cursor);
  if (right < pageCount - 1) items.push("ellipsis");
  items.push(pageCount);
  return items;
}

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  previousLabel = "上一页",
  nextLabel = "下一页",
  className,
}: PaginationProps) {
  const current = pageCount <= 0 ? 1 : Math.min(Math.max(page, 1), pageCount);
  const items = paginationItems(current, pageCount, siblingCount);

  return (
    <Primitive.nav aria-label="pagination" className={cn("flex flex-wrap items-center gap-1", className)}>
      <Primitive.button
        type="button"
        aria-label={previousLabel}
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
        className={pageButtonClass(false)}
      >
        <ChevronLeft className="size-4" />
      </Primitive.button>
      {items.map((item, index) =>
        item === "ellipsis" ? (
          <Primitive.span
            key={`ellipsis-${String(index)}`}
            className="px-1.5 text-sm text-fg-faint"
            aria-hidden
          >
            …
          </Primitive.span>
        ) : (
          <Primitive.button
            key={item}
            type="button"
            aria-label={`第 ${String(item)} 页`}
            aria-current={item === current ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={pageButtonClass(item === current)}
          >
            {item}
          </Primitive.button>
        ),
      )}
      <Primitive.button
        type="button"
        aria-label={nextLabel}
        disabled={current >= pageCount}
        onClick={() => onPageChange(current + 1)}
        className={pageButtonClass(false)}
      >
        <ChevronRight className="size-4" />
      </Primitive.button>
    </Primitive.nav>
  );
}

function pageButtonClass(active: boolean): string {
  return cn(
    "inline-flex size-8 items-center justify-center rounded-lg border text-sm",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:cursor-not-allowed disabled:opacity-40",
    active
      ? "border-accent bg-accent-soft text-accent shadow-stamp"
      : "border-line bg-surface-raised text-fg-muted hover:border-line-strong hover:text-fg",
  );
}
