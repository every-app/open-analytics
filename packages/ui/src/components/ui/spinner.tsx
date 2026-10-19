import { LoaderCircleIcon } from "lucide-react";

import { cn } from "../../lib/utils";

export type SpinnerProps = Omit<
  React.ComponentProps<typeof LoaderCircleIcon>,
  "children"
>;

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <LoaderCircleIcon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
