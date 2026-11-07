import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useHydrated } from "@/hooks/use-hydrated";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Probe() {
  return createElement("span", null, useHydrated() ? "client" : "server");
}

describe("useHydrated", () => {
  it("is false in the server's HTML and true once rendered in the browser", () => {
    expect(renderToString(createElement(Probe))).toBe("<span>server</span>");

    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(createElement(Probe)));
    expect(container.textContent).toBe("client");
    act(() => root.unmount());
  });
});
