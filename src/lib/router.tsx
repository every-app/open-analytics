import { type AnchorHTMLAttributes, forwardRef, useMemo } from "react";
import {
  Link as TanStackLink,
  useLocation,
  useNavigate,
  useRouter as useTanStackRouter,
} from "@tanstack/react-router";

import { dashboardShellQueryOptions } from "@/lib/dashboard/route-query";
interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  scroll?: boolean;
}
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, scroll = true, ...props },
  ref,
) {
  return <TanStackLink {...props} ref={ref} to={href} resetScroll={scroll} />;
});
export default Link;
export function usePathname(): string {
  return useLocation({ select: (location) => location.pathname });
}
export function useSearchParams(): URLSearchParams {
  const searchStr = useLocation({ select: (location) => location.searchStr });
  return useMemo(() => new URLSearchParams(searchStr), [searchStr]);
}
export function useRouter() {
  const router = useTanStackRouter();
  const navigate = useNavigate();

  return useMemo(
    () => ({
      back: () => router.history.back(),
      forward: () => router.history.forward(),
      push: (href: string, options?: { scroll?: boolean }) => {
        return navigate({
          to: href,
          resetScroll: options?.scroll !== false,
        });
      },
      refresh: () => {
        router.options.context.queryClient.removeQueries({
          queryKey: dashboardShellQueryOptions.queryKey,
        });
        return router.invalidate();
      },
      replace: (href: string, options?: { scroll?: boolean }) => {
        return navigate({
          to: href,
          replace: true,
          resetScroll: options?.scroll !== false,
        });
      },
    }),
    [navigate, router],
  );
}
