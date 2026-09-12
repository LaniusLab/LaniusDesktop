import { Primitive } from "@radix-ui/react-primitive";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: ReadonlyArray<BreadcrumbItem>;
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <Primitive.nav aria-label="breadcrumb" className={className}>
      <Primitive.ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          const interactive = !last && (item.href !== undefined || item.onClick !== undefined);

          return (
            <Primitive.li key={`${item.label}-${String(index)}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3.5 text-fg-faint" aria-hidden /> : null}
              {last ? (
                <Primitive.span aria-current="page" className="font-medium text-fg">
                  {item.label}
                </Primitive.span>
              ) : interactive && item.href !== undefined ? (
                <Primitive.a
                  href={item.href}
                  onClick={item.onClick}
                  className="text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {item.label}
                </Primitive.a>
              ) : interactive ? (
                <Primitive.button
                  type="button"
                  onClick={item.onClick}
                  className="cursor-pointer text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {item.label}
                </Primitive.button>
              ) : (
                <Primitive.span className="text-fg-muted">{item.label}</Primitive.span>
              )}
            </Primitive.li>
          );
        })}
      </Primitive.ol>
    </Primitive.nav>
  );
}
