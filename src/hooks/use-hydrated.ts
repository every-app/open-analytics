import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and while the page hydrates, true from then on. Text
 * that depends on the browser, like a date in the viewer's time zone, waits
 * for it so the server's HTML and the first client render agree.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
