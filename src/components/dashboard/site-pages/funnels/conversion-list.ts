import type { ReactNode } from "react";

/**
 * One kind of conversion (goals or funnels) as the Conversions page lists it:
 * its cards, its list state, and the dialogs and drawers that act on it.
 */
export interface ConversionList {
  readonly cards: ReactNode[];
  readonly skeleton: (index: number) => ReactNode;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly retry: () => void;
  readonly hasNextPage: boolean;
  readonly loadMore: () => void;
  readonly openCreate: () => void;
  readonly overlays: ReactNode;
}
