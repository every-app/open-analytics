import { cn } from "../../lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "skeleton-loading rounded-md bg-foreground/[0.06]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

export type SkeletonProps = React.ComponentPropsWithRef<typeof Skeleton>;
