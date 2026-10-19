import Link from "@/lib/router";
import { cn } from "@/lib/utils";

export interface NavTabItem {
  key: string;
  href: string;
  label: string;
  active: boolean;
}

/** OpenSEO's strip of route tabs: underlined under the page you're on. */
export function NavTabs({
  label,
  items,
  className,
}: {
  label: string;
  items: NavTabItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-border",
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          data-status={item.active ? "active" : undefined}
          className="relative inline-flex h-9 shrink-0 items-center px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground after:opacity-0 hover:text-foreground focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 data-[status=active]:text-foreground data-[status=active]:after:opacity-100"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
